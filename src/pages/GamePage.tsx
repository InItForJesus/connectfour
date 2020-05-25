import React from 'react';
import { Container, Typography, Theme, createStyles, withStyles, Grid, Button, AppBar, Toolbar } from '@material-ui/core';
import { Link } from 'react-router-dom';
import { Client, Frame, Message } from '@stomp/stompjs';
import { StartGameRequestDto, StartGameResponeDto, UserNotificationDto, MoveResponseDto, MoveRequestDto } from '../model/StompMessagingDtos';
import { v4 as Uuidv4 } from 'uuid'
import GameBoard, { GAME_BOARD_COLOR_CODE, RED_COLOR_CODE, YELLOW_COLOR_CODE } from '../component/GameBoard';

// *** This configuration changes whether local or on Heorku
//const BROKER_URL: string = 'ws://localhost:8401/connect-four-ws/websocket';
const BROKER_URL:string = 'wss://fotf-connect-four-api.herokuapp.com/connect-four-ws/websocket';

const Styles = (theme: Theme) =>
    createStyles({
        statusTitle: {
            flexGrow: 1,
        },
        pageText: {
            alignSelf: 'center',
        },
        exitButton: {
            marginleft: theme.spacing(2),
            marginRight: theme.spacing(2),
        },
        playAgainButton: {
            marginleft: theme.spacing(2),
            marginRight: theme.spacing(2),
            color: GAME_BOARD_COLOR_CODE,
        },
        headerTitle: {
            flexGrow: 1,
        },

    });
/*
Game Page Props - there are no external props or hooks needed
*/
type GamePageProps = {
    classes: {
        statusTitle: string;
        pageText: string;
        exitButton: string;
        playAgainButton: string;
        headerTitle: string;
    };
}

/*
Game Page State
    isConnected - flag for indicating if connected via stomp/websocket or not
    userId - uuid for this instance used for validations and stomp/websocket subscriptions
    gameId - current id of game being played as given to us by the game server
    userColor - the color being played by this user; must be RED or YELLOW
    userColorCode - the html color code for this user's color
    externalMoveLocation - hook to tell game board what the other players move was
    statusText - messages to the user about the state of the game
    gameBoardEnabled - hook to enable/disable interaction on the game board
    playAgainisVisible - flag to toggle the visibilty of the 'play again' button
    resetGameBoard - hook to tell the game board to reset to starting state
*/
type GamePageState = {
    isConnected: boolean; // TODO maybe need to seomthing more with this?
    userId: string;
    gameId: number;
    userColor: string;
    userColorCode: string;
    externalMoveLocation: string;
    statusText: string;
    gameBoardEnabled: boolean;
    playAgainisVisible: boolean;
    resetGameBoard: boolean;
    keepAlive: number;
}
/*
Game Page Component - main controlling componont for the connect four game.
  Encompasses all the stomp/websocket communications. Manages the display of the game page and process. 
*/
class GamePage extends React.Component<GamePageProps, GamePageState> {
    private static STATUS_CONNECTING = "Connecting...";
    private static STATUS_CONNECTED = "Connected";
    private static STATUS_WAITING_TO_START = "Waiting for opponent to join";
    private static STATUS_WAITING_FOR_OPPONENT = "Waiting for opponent to move";
    private static STATUS_YOUR_TURN = "Your Turn";
    private static STATUS_PROCESSING = "Processing ...";
    private static STATUS_GAME_OVER = "Game over";
    private static STATUS_ERROR = "Something went wrong. Exit and try again.";

    private stompClient: Client;

    constructor(props: any) {
        super(props);
        this.state = {
            isConnected: false,
            userId: Uuidv4(),
            gameId: 0, 
            externalMoveLocation: '',
            userColor: '',
            userColorCode: GAME_BOARD_COLOR_CODE,
            statusText: GamePage.STATUS_CONNECTING,
            gameBoardEnabled: false,
            playAgainisVisible: false,
            resetGameBoard: false,
            keepAlive: 0,
        };
        this.stompClient = new Client();
        this.onConnect = this.onConnect.bind(this);
        this.keepAlive = this.keepAlive.bind(this);
        this.onDisconnect = this.onDisconnect.bind(this);
        this.onStompError = this.onStompError.bind(this);
        this.onGameStart = this.onGameStart.bind(this);
        this.onGameMove = this.onGameMove.bind(this);
        this.onGameAlert = this.onGameAlert.bind(this);
        this.onChipDrop = this.onChipDrop.bind(this);
        this.playAgainOnClick = this.playAgainOnClick.bind(this);
        this.exitGameOnClick = this.exitGameOnClick.bind(this);
        console.debug("GamePage Constructor executed, userId: " + this.state.userId);
    }

    // on loading component, activate stomp/websocket connection
    componentDidMount() {
        this.setState({ playAgainisVisible: false });
        this.stompClient.brokerURL = BROKER_URL;
        this.stompClient.onConnect = this.onConnect;
        this.stompClient.onDisconnect = this.onDisconnect;
        this.stompClient.onStompError = this.onStompError;
        this.stompClient.activate();
    } // TODO - disconnect on exit

    // wait for isConnected state to change to start the game
    componentDidUpdate(prevProps: GamePageProps, prevState: GamePageState) {
        if (!prevState.isConnected && this.state.isConnected) {
            this.startNewGame();
        }
    }

    // make stomp request to start the game
    startNewGame() {
        const startGameRequestDto: StartGameRequestDto = { userId: this.state.userId };
        startGameRequestDto.userId = this.state.userId;
        const request: string = JSON.stringify(startGameRequestDto);
        console.debug('sending start: ' + request);
        this.stompClient.publish({ destination: '/connectfour/start', body: request });
    }

    // Stomp client onConnect handler - set up the queue listners/subscriptions
    onConnect(frame: Frame) { 
        const keepAlive: number = window.setInterval(this.keepAlive, 20000) // 20 seconds Heroku recommeds 30 sec 
        console.log('onConnect frame: ' + frame)
        console.log('url: ' + this.stompClient.webSocket.url);
        this.stompClient.subscribe('/user/' + this.state.userId + '/queue/start', this.onGameStart);
        this.stompClient.subscribe('/user/' + this.state.userId + '/queue/move', this.onGameMove);
        this.stompClient.subscribe('/user/' + this.state.userId + '/queue/alert', this.onGameAlert);
        console.debug("subscribed to start, move, and alert queues with userId " + this.state.userId);
        this.setState({ isConnected: true, statusText: GamePage.STATUS_CONNECTED, keepAlive: keepAlive });
        //TODO why does it go to STATUS_CONNECTED state when I turn back on the server and not get disconnect??? May need ack/nack 
    }

    //This was added to keep Heroku from killing the connection
    keepAlive() {
        this.stompClient.publish({ destination: '/connectfour/keepAlive', body: this.state.userId});
    }

    // Stomp client onDisconnect handler
    onDisconnect(frame: Frame) {
        console.log('onDisconnect frame: ' + frame)
        //TODO figure out better response
        console.error('Broker Diconnected: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
        this.setState({ isConnected: false });
        this.reportError();
    }

    // Stomp client onStompError handler
    onStompError(frame: Frame) {
        console.log('onError frame: ' + frame)
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
        this.setState({ isConnected: false });
        this.reportError();
    }

    // Report error to user and kill stomp/websocket conection
    reportError() {
        this.setState({ statusText: GamePage.STATUS_ERROR, gameBoardEnabled: false });
        if (this.stompClient) {
            this.stompClient.deactivate();
        }
        const keepAlive = this.state.keepAlive;
        window.clearInterval(keepAlive);
    }

    // Game start response listener
    onGameStart(message: Message) {
        if (message.body) {
            const gameStartReponse: StartGameResponeDto = JSON.parse(message.body);
            console.debug("start response: " + message.body);
            if (gameStartReponse.userId === this.state.userId) {
                var userColorCode: string = YELLOW_COLOR_CODE;
                if ('RED' === gameStartReponse.playerColor) {
                    userColorCode = RED_COLOR_CODE;
                }
                var statusText: string = GamePage.STATUS_WAITING_FOR_OPPONENT;
                var gameBoardEnabled: boolean = false;
                if (gameStartReponse.waiting) {
                    statusText = GamePage.STATUS_WAITING_TO_START;
                } else if (gameStartReponse.goesFirst === gameStartReponse.playerColor) {
                    statusText = GamePage.STATUS_YOUR_TURN;
                    gameBoardEnabled = true;
                }
                this.setState({
                    userColor: gameStartReponse.playerColor, userColorCode: userColorCode, gameBoardEnabled: gameBoardEnabled,
                    statusText: statusText, gameId: gameStartReponse.gameId, resetGameBoard: false
                });
            } else {
                console.error('gameStartReponse failed validation'); // TODO build better error message
                this.reportError();
            }
        } else {
            console.error("onGameStart got an empty message");
            this.reportError();
        }
    }

    // Game move response listener
    onGameMove(message: Message) {
        if (message.body) {
            const moveResponseDto: MoveResponseDto = JSON.parse(message.body);
            console.debug("move message: " + message.body);
            if (moveResponseDto.gameId === this.state.gameId && moveResponseDto.userId === this.state.userId) {
                this.setState({ statusText: GamePage.STATUS_YOUR_TURN, externalMoveLocation: moveResponseDto.chipLocation, gameBoardEnabled: true });
            } else {
                console.error('moveReponse failed validation'); // TODO build better error message
                this.reportError();
            }
        } else {
            console.error("onGameMove got an empty message");
            this.reportError();
        }
    }

    // Game alert (user notification) response listener
    onGameAlert(message: Message) {
        if (message.body) {
            const userNotificationDto: UserNotificationDto = JSON.parse(message.body);
            console.debug("user notification: " + message.body);
            if (userNotificationDto.gameId === this.state.gameId && userNotificationDto.userId === this.state.userId) {
                switch (userNotificationDto.type) {
                    case 'OPPONENT_JOINED': // If other player goes first
                        this.setState({ statusText: GamePage.STATUS_WAITING_FOR_OPPONENT });
                        break;
                    case 'YOUR_MOVE': // If you go first
                        this.setState({ statusText: GamePage.STATUS_YOUR_TURN, gameBoardEnabled: true });
                        break;
                    case 'GAME_OVER':
                        var cause: string = '';
                        switch (userNotificationDto.message) {
                            case 'YOU_WON':
                                cause = "- Congratulations, You WON!";
                                break;
                            case 'YOU_LOST':
                                cause = "- Sorry, better luck next time";
                                break;
                            case 'DRAW':
                                cause = "- Good game, it is a tie";
                                break;
                            case 'OPPONENT_QUIT':
                                cause = "- Your opponent had to leave";
                                break;
                        }
                        this.setState({ statusText: GamePage.STATUS_GAME_OVER + cause, gameBoardEnabled: false, playAgainisVisible: true });
                        break;
                    case 'ERROR':
                    default:
                        console.error('userNotification unknown type') // TODO build better error message
                        this.reportError();
                }
            } else {
                console.error('userNotification failed validation');
                console.debug('DTO gameId: ' + userNotificationDto.gameId + ', state gameId: ' + this.state.gameId);
                console.debug('DTO userId: ' + userNotificationDto.userId + ', state userId: ' + this.state.userId);
                this.reportError();
            }
        } else {
            console.error("onGameStart got an empty message");
            this.reportError();
        }
    }

    // callback function/listener for handeling user input on game baord 
    onChipDrop(chipLocation: string) {
        this.setState({ statusText: GamePage.STATUS_WAITING_FOR_OPPONENT, gameBoardEnabled: false });
        console.debug("Chip dropped at: " + chipLocation);
        const moveRequestDto: MoveRequestDto = {
            userId: this.state.userId,
            gameId: this.state.gameId,
            playerColor: this.state.userColor,
            chipLocation: chipLocation
        };
        const request: string = JSON.stringify(moveRequestDto);
        console.debug("sending move: " + request)
        this.stompClient.publish({ destination: '/connectfour/move', body: request });
    }

    playAgainOnClick() {
        this.setState({ playAgainisVisible: false, resetGameBoard: true, gameId: 0 });
        this.startNewGame();
    }

    exitGameOnClick() {
        this.stompClient.deactivate();
        const keepAlive = this.state.keepAlive;
        window.clearInterval(keepAlive);

    }

    renderAppBar() {
        const { classes } = this.props;
        return (
            <AppBar style={{ color: 'white', background: this.state.userColorCode }} position="static">
                <Toolbar>
                    <Typography variant='h5' className={classes.headerTitle} >Game #{this.state.gameId}</Typography>
                    <Typography variant='h5' className={classes.statusTitle} >{this.state.statusText}</Typography>
                    <Button variant='contained' className={classes.playAgainButton} onClick={this.playAgainOnClick}
                        style={{ visibility: (this.state.playAgainisVisible ? 'visible' : 'hidden') }} >
                        Play Again?
                    </Button>
                    <Button variant='contained' className={classes.exitButton} onClick={this.exitGameOnClick}>
                        <Link to='/' style={{ textDecoration: 'none', color: GAME_BOARD_COLOR_CODE }}>
                            Exit Game
                        </Link>
                    </Button>
                </Toolbar>
            </AppBar>
        );
    }

    render() {
        const { classes } = this.props;
        return (
            <Container component='div'>
                {this.renderAppBar()}
                <Grid container justify='center'>
                    <Grid item>
                        {/* <Typography variant='h1' className={classes.pageTitle}>New Connect Four Game</Typography> */}
                    </Grid>
                    <Grid container justify='center'>
                        {/* TODO:Create place holder/spacer */}
                        <Typography variant='body1' className={classes.pageText}><br /><br /></Typography>
                    </Grid>
                    <Grid >
                        <GameBoard enabled={this.state.gameBoardEnabled} playerColor={this.state.userColor} reset={this.state.resetGameBoard}
                            onChipDrop={this.onChipDrop} extrnalMove={this.state.externalMoveLocation} />
                    </Grid>
                </Grid>
            </Container>
        );
    }
}

export default withStyles(Styles)(GamePage);
