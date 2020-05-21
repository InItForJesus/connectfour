import React from 'react';
import { Container, Table, Paper, Typography, Theme, createStyles, withStyles, Grid, Button, AppBar, Toolbar } from '@material-ui/core';
import { Link } from 'react-router-dom';
import { Client, Frame, StompSubscription, Message } from '@stomp/stompjs';
import { StartGameRequestDto } from '../model/StartGameDto';
import { v4 as Uuidv4 } from 'uuid'
import GameBoard, { gameBoardColor, redColorCode, yellowColorCode } from '../component/GameBoard';

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
        headerTitle: {
            flexGrow: 1,
        },

    });

type GamePageProps = {
    classes: {
        statusTitle: string;
        pageText: string;
        exitButton: string;
        headerTitle: string;
    };
}

type GamePageState = {
    isConnected: boolean;
    userId: string;
    userColor: string;
    userColorCode: string;
    externalMoveLocation: string;
    statusText: string;
    gameBoardEnabled: boolean
}

class GamePage extends React.Component<GamePageProps, GamePageState> {

    private static STATUS_CONNECTING = "Connecting...";
    private static STATUS_CONNECTED = "Connected";
    private static STATUS_WAITING_TO_START = "Waiting for opponent to join";
    private static STATUS_WAITING_FOR_OPPONENT = "Waiting for opponent to move";
    private static STATUS_YOUR_TURN = "Your Turn";
    private static STATUS_GAME_OVER = "Game over";
    private static STATUS_ERROR = "Something went wrong";

    private stompClient: Client;

    constructor(props: any) {
        super(props);
        this.state = {
            isConnected: false,
            userId: Uuidv4(),
            externalMoveLocation: '',
            userColor: '',
            userColorCode: gameBoardColor,
            statusText: GamePage.STATUS_CONNECTING,
            gameBoardEnabled: false,
        };
        this.stompClient = new Client();
        this.onConnect = this.onConnect.bind(this);
        this.onDisconnect = this.onDisconnect.bind(this);
        this.onChipDrop = this.onChipDrop.bind(this);
        this.renderAppBar = this.renderAppBar.bind(this);
    }

    componentDidMount() {
        this.stompClient.brokerURL = 'ws://localhost:8401/connect-four-ws/websocket'; //make configurable
        this.stompClient.onConnect = this.onConnect
        this.stompClient.onDisconnect = this.onDisconnect
        this.stompClient.onStompError = function (frame: Frame) { // TODO Handle error
            console.log('Broker reported error: ' + frame.headers['message']);
            console.log('Additional details: ' + frame.body);
        }
        this.stompClient.activate();
        console.log("Done Sending request")
    }

    componentDidUpdate(prevProps: GamePageProps, prevState: GamePageState) {
        if (!prevState.isConnected && this.state.isConnected) {
            this.requestGameStart();
        }
    }

    onConnect(frame: Frame) {
        this.setState({ isConnected: true, statusText: GamePage.STATUS_CONNECTED });

        const subsription: StompSubscription = this.stompClient.subscribe('/user/' + this.state.userId + '/queue/start', this.onGameStart)
        console.log('subscribed');
        console.log(subsription);
    }

    requestGameStart() {
        // const subsription: StompSubscription =  this.client.subscribe('/topic/start', this.onGameStart)
        // console.log('subscribed');
        // console.log(subsription);
        const request: StartGameRequestDto = new StartGameRequestDto();
        request.userId = this.state.userId;
        this.stompClient.publish({ destination: '/connectfour/start', body: JSON.stringify(request) });
    }

    onGameStart(message: Message) {
        if (message.body) {
            console.log("got message with body " + message.body)
        } else {
            console.log("got empty message");
        }
    }

    onDisconnect(frame: Frame) {
        console.log('Broker Diconnected: ' + frame.headers['message']);
        console.log('Additional details: ' + frame.body);
        this.setState({ isConnected: false });
    }

    onChipDrop(chipLocation: string) {
        console.log("Chip dropped at: " + chipLocation);
    }

    renderAppBar() {
        const { classes } = this.props;
        return (
            <AppBar style={{ color: 'white', background: this.state.userColorCode }} position="static">
                <Toolbar>
                    <Typography variant='h5' className={classes.headerTitle} >Connect Four</Typography>
                    <Typography variant='h5' className={classes.statusTitle} >Status: {this.state.statusText}</Typography>
                    <Button variant='contained' className={classes.exitButton}>
                        <Link to='/' style={{ textDecoration: 'none', color: this.state.userColorCode }}>
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
                        <Typography variant='body1' className={classes.pageText}><br/><br/></Typography>
                    </Grid>
                    <Grid >
                        <GameBoard enabled={this.state.gameBoardEnabled} playerColor='RED' onChipDrop={this.onChipDrop} extrnalMove={this.state.externalMoveLocation} />
                    </Grid>
                </Grid>
            </Container>
        );
    }

}

export default withStyles(Styles)(GamePage);
