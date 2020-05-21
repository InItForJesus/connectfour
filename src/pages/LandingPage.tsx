import React from 'react';
import { Container, Table, Paper, Typography, Theme, createStyles, withStyles, Grid, Button } from '@material-ui/core';
import { useHistory, Redirect, Link } from 'react-router-dom';
import GameBoard from '../component/GameBoard';

const Styles = (theme: Theme) =>
    createStyles({
        page: { //TODO get this to center vertically
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
        },
        pageTitle: {
            flexGrow: 1,
        },
        pageText: {
            alignSelf: 'center',
        },
        playButton: {
            background: 'DodgerBlue',
        },
    });

type LandingPageProps = {
    classes: {
        page: string;
        pageTitle: string;
        pageText: string;
        playButton: string;
    };
}

class LandingPage extends React.Component<LandingPageProps, {}> {
    constructor(props: any) {
        super(props);
    }

    render() {
        const { classes } = this.props;
        return (
            <Container component='div' className={classes.page}>
                <Grid container justify='center'>
                    <Grid item>
                        <Typography variant='h1' className={classes.pageTitle}>Connect Four</Typography>
                    </Grid>
                    <Grid container justify='center'>
                        <Typography variant='body1' className={classes.pageText}>Want to play a game?<p /><p /></Typography>
                    </Grid>
                    <Grid container justify='center'>
                        <Button variant='contained' className={classes.playButton}>
                            <Link to='/game' style={{ textDecoration: 'none', color: 'white' }}>
                                Start Game
                            </Link>
                        </Button>
                    </Grid>
                </Grid>
            </Container>
        );
    }

}

export default withStyles(Styles)(LandingPage);
