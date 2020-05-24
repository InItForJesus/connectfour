import React from 'react';
import { Container, Table, Paper, Typography, Theme, createStyles, withStyles, Grid, Button, AppBar, Toolbar } from '@material-ui/core';
import { Link } from 'react-router-dom';
import { Client, Frame, StompSubscription, Message } from '@stomp/stompjs';
import { StartGameRequestDto, StartGameResponeDto, UserNotificationDto, MoveResponseDto, MoveRequestDto } from '../model/StompMessagingDtos';
import { v4 as Uuidv4 } from 'uuid'
import GameBoard, { gameBoardColor, redColorCode, yellowColorCode } from '../component/GameBoard';
import { stringify } from 'querystring';

// *** This is configuration changes whether local or on Heorku
//const BROKER_URL:string = 'ws://localhost:8401/connect-four-ws/websocket';
const BROKER_URL:string = 'wss://fotf-connect-four-api.herokuapp.com/connect-four-ws/websocket';

const Styles = (theme: Theme) =>
    createStyles({
        statusTitle: {
            flexGrow: 1,
            //textAlign: 'center'
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
            color: gameBoardColor,
        },
        headerTitle: {
            flexGrow: 1,
        },

    });

type GamePageProps = {
    classes: {
        statusTitle: string;
        pageText: string;
        exitButton: string;
        playAgainButton: string;
        headerTitle: string;
    };
}

type GamePageState = {
    isConnected: boolean;
    userId: string;
    gameId: number;
    userColor: string;
    userColorCode: string;
    externalMoveLocation: string;
    statusText: string;
    gameBoardEnabled: boolean;
    playAgainisVisible: boolean;
    resetGameBoard: boolean;
}

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
            userColorCode: gameBoardColor,
            statusText: GamePage.STATUS_CONNECTING,
            gameBoardEnabled: false,
            playAgainisVisible: false,
            resetGameBoard: false,
        };
        this.stompClient = new Client();
        this.activateNewConnection = this.activateNewConnection.bind(this);
        this.startNewGame = this.startNewGame.bind(this);
        this.onConnect = this.onConnect.bind(this);
        this.onDisconnect = this.onDisconnect.bind(this);
        this.onStompError = this.onStompError.bind(this);
        this.onGameStart = this.onGameStart.bind(this);
        this.onGameMove = this.onGameMove.bind(this);
        this.onGameAlert = this.onGameAlert.bind(this);
        this.onChipDrop = this.onChipDrop.bind(this);
        this.displayPlayAgain = this.displayPlayAgain.bind(this);
        this.playAgainOnClick = this.playAgainOnClick.bind(this);
        this.renderAppBar = this.renderAppBar.bind(this);
    }

    componentDidMount() {
        this.activateNewConnection();
    }

    activateNewConnection() {
        this.setState({ playAgainisVisible: false });
        this.stompClient.brokerURL = BROKER_URL; //make configurable
        this.stompClient.onConnect = this.onConnect;
        this.stompClient.onDisconnect = this.onDisconnect;
        this.stompClient.onStompError = this.onStompError;
        this.stompClient.activate();
    }

    componentDidUpdate(prevProps: GamePageProps, prevState: GamePageState) {
        if (!prevState.isConnected && this.state.isConnected) {
            this.startNewGame();
        }
    }

    startNewGame() {
        const startGameRequestDto: StartGameRequestDto = { userId: this.state.userId };
        startGameRequestDto.userId = this.state.userId;
        const request: string = JSON.stringify(startGameRequestDto);
        console.debug('sending start: ' + request);
        this.stompClient.publish({ destination: '/connectfour/start', body: request });
    }

    onConnect(frame: Frame) {
        console.log('onConnect frame: '+frame)
        this.stompClient.subscribe('/user/' + this.state.userId + '/queue/start', this.onGameStart);
        this.stompClient.subscribe('/user/' + this.state.userId + '/queue/move', this.onGameMove);
        this.stompClient.subscribe('/user/' + this.state.userId + '/queue/alert', this.onGameAlert);
        console.debug("subscribed to start, move, and alert queues with userId " + this.state.userId)
        this.setState({ isConnected: true, statusText: GamePage.STATUS_CONNECTED }); //TODO why does it go to this state when I turn back on the server and not get disconnect???
    }

    onDisconnect(frame: Frame) {
        console.log('onDisconnect frame: '+frame)
        //TODO figure out better response
        console.error('Broker Diconnected: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
        this.setState({ isConnected: false });
        this.reportError();
    }

    onStompError(frame: Frame) {
        console.log('onError frame: '+frame)
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
        this.setState({ isConnected: false });
        this.reportError();
    }

    reportError() {
        this.setState({ statusText: GamePage.STATUS_ERROR, gameBoardEnabled: false });
        if (this.stompClient) {
            this.stompClient.deactivate();
        }
    }

    onGameStart(message: Message) {
        if (message.body) {
            //const gameStartReponse: StartGameResponeDto = JSON.parse(message.body);
            const gameStartReponse: StartGameResponeDto = JSON.parse(message.body);
            console.debug("start response: " + message.body);

            if (gameStartReponse.userId === this.state.userId) {
                var userColorCode = yellowColorCode;
                if ('RED' === gameStartReponse.playerColor) {
                    userColorCode = redColorCode;
                }

                var statusText: string = GamePage.STATUS_WAITING_FOR_OPPONENT;
                if (gameStartReponse.waiting) {
                    statusText = GamePage.STATUS_WAITING_TO_START;
                } else if (gameStartReponse.goesFirst === gameStartReponse.playerColor) {
                    statusText = GamePage.STATUS_YOUR_TURN;
                }

                this.setState({
                    userColor: gameStartReponse.playerColor, userColorCode: userColorCode,
                    statusText: statusText, gameId: gameStartReponse.gameId, resetGameBoard: false
                });
            } else {
                console.error('gameStartReponse failed validation') // TODO build better error message
                this.reportError();
            }

        } else {
            console.error("onGameStart got an empty message");
            this.reportError();
        }
    }

    onGameMove(message: Message) {
        if (message.body) {
            const moveResponseDto: MoveResponseDto = JSON.parse(message.body);
            console.debug("move message: " + message.body);
            if (moveResponseDto.gameId === this.state.gameId && moveResponseDto.userId === this.state.userId) {
                this.setState({ statusText: GamePage.STATUS_PROCESSING, externalMoveLocation: moveResponseDto.chipLocation });
            } else {
                console.error('moveReponse failed validation') // TODO build better error message
                this.reportError();
            }
        } else {
            console.error("onGameMove got an empty message");
            this.reportError();
        }
    }

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
                        this.setState({ statusText: GamePage.STATUS_GAME_OVER + cause, gameBoardEnabled: false });
                        this.displayPlayAgain();
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

    displayPlayAgain() {
        this.setState({ playAgainisVisible: true });
    }

    playAgainOnClick() {
        this.setState({ playAgainisVisible: false, resetGameBoard: true});
        this.startNewGame();
    }

    renderAppBar() {
        const { classes } = this.props;
        return (
            <AppBar style={{ color: 'white', background: this.state.userColorCode }} position="static">
                <Toolbar>
                    <Typography variant='h5' className={classes.headerTitle} >Connect Four</Typography>
                    <Typography variant='h5' className={classes.statusTitle} >{this.state.statusText}</Typography>
                    <Button variant='contained' className={classes.playAgainButton} onClick={this.playAgainOnClick}
                        style={{ visibility: (this.state.playAgainisVisible ? 'visible' : 'hidden') }} >
                        Play Again?
                    </Button>
                    <Button variant='contained' className={classes.exitButton}>
                        <Link to='/' style={{ textDecoration: 'none', color: gameBoardColor }}>
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
