import React from 'react';
import { Rect, Circle, Stage, Layer } from 'react-konva';
import { Theme, createStyles, Container, withStyles } from '@material-ui/core';
import { GAME_BOARD_COLOR_CODE } from './GameBoard';

const Styles = (theme: Theme) =>
    createStyles({
        gameTile: { 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
        }
    });

/*
GameTile Properties
color - html color code that controls the color of the circle
tileSize - The width and height of the tile in pixels
*/
type GameTileProps = {
    color: string;
    tileSize: number;
    classes: {
        gameTile: string;
    };
}

/*  
GameTile - One tile in the game board. Use Konva graphics library to draw a square with a circle in it.
 */
class GameTile extends React.Component<GameTileProps, {}> {
    constructor(props: any) {
        super(props);
    }

    render() {
        const { classes } = this.props;
        return (
            <Container component='div' className={classes.gameTile}>
                <Stage width={this.props.tileSize} height={this.props.tileSize}>
                    <Layer>
                        <Rect width={this.props.tileSize} height={this.props.tileSize} fill={GAME_BOARD_COLOR_CODE} />
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
