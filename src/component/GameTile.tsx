import React from 'react';
import Konva from 'konva';
import { Rect, Circle, Stage, Layer } from 'react-konva';
import { Theme, createStyles, Container, withStyles } from '@material-ui/core';
import { gameBoardColor } from './GameBoard';

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
            alignSelf: 'center',
        }
    });

type GameTileProps = {
    color: string;
    tileSize: number;
    classes: {
        page: string;
        pageTitle: string;
        pageText: string;
        playButton: string;
    };
}

class GameTile extends React.Component<GameTileProps, {}> {
    constructor(props: any) {
        super(props);
    }

    render() {
        const { classes } = this.props;
        return (
            <Container component='div' className={classes.page}>
                <Stage width={this.props.tileSize} height={this.props.tileSize}>
                    <Layer>
                        <Rect width={this.props.tileSize} height={this.props.tileSize} fill={gameBoardColor} />
                    </Layer>
                    <Layer>
                        <Circle fill={this.props.color} radius={this.props.tileSize * .42} X={this.props.tileSize / 2} Y={this.props.tileSize / 2} />
                    </Layer>

                </Stage>

            </Container>
        );
    }

}

export default withStyles(Styles)(GameTile);
