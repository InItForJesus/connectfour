import React from 'react';
import { Theme, createStyles, Container, Grid, withStyles, Button, IconButton, Tooltip } from '@material-ui/core';
import GameTile from './GameTile';
import ColumnIcon from '@material-ui/icons/Details';

// Color code constants available to be used by other modules
export const RED_COLOR_CODE: string = 'crimson';
export const YELLOW_COLOR_CODE: string = 'gold';
export const GAME_BOARD_COLOR_CODE: string = 'DodgerBlue';

// additional constants used in style and code
const TILE_SIZE: number = 65;
const BOARD_ROWS: number = 7;
const BOARD_COLUMNS: number = 6;
const BUTTON_HIEGHT: number = TILE_SIZE;

const Styles = (theme: Theme) =>
    createStyles({
        boardGrid: {
            width: TILE_SIZE * BOARD_COLUMNS,
            height: TILE_SIZE * BOARD_ROWS + BUTTON_HIEGHT
        },
        columnGrid: {
            width: TILE_SIZE,
            height: TILE_SIZE * BOARD_ROWS + BUTTON_HIEGHT
        },
        cellGrid: {
            width: TILE_SIZE,
            height: TILE_SIZE
        },
        selectorButtonRed: {
            width: TILE_SIZE,
            height: TILE_SIZE,
            '&:hover': {
                background: RED_COLOR_CODE,
            }
        },
        selectorButtonYellow: {
            width: TILE_SIZE,
            height: TILE_SIZE,
            '&:hover': {
                background: YELLOW_COLOR_CODE,
            }
        }
    });

/*
Game Board Properties
playerColor - the color for the player using this board; must be RED or YELLOW
enabled - hook to control if the board is intercative or not
externalMove - hook to identify where to place the other players chip
reset - hook to tell the board to reset to the startup state
onChipDrop - callback notification of the chip location of the player's dropped chip
*/
type GameBoardProps = {
    playerColor: string;
    enabled: boolean;
    extrnalMove: string;
    reset: boolean;
    onChipDrop: ((locationCode: string) => void);
    classes: {
        boardGrid: string;
        columnGrid: string;
        cellGrid: string;
        selectorButtonRed: string;
        selectorButtonYellow: string;
    };
}
/*
Game Board State
tiles - 2D array to hold colors for all game board tiles
nextTiles - placeholder by column for what is the next tile space to use for that column
selctorsEnabled - enable/disable the selector button for each column
*/
type GameBoardState = {
    tiles: string[][];
    nextTiles: number[];
    selctorsEnabled: boolean[];
}

/*
Game Board component - A complete board for one player. It manages the display and interactions of the game baord
*/
class GameBoard extends React.Component<GameBoardProps, GameBoardState> {
    private columnLetters: string[] = ['A', 'B', 'C', 'D', 'E', 'F'];

    constructor(props: any) {
        super(props);
        this.state = {
            tiles: [],
            nextTiles: [],
            selctorsEnabled: [],
        };
        this.initGameBoard();
    }

    // Monitor and respond to external hooks that require processing
    componentDidUpdate(prevProps: GameBoardProps) {
        if (prevProps.extrnalMove !== this.props.extrnalMove && '' !== this.props.extrnalMove) {
            this.processExternalMove(this.props.extrnalMove);
        }
        if (!prevProps.reset && this.props.reset) {
            this.resetGameBoard();
        }
    }

    // create and initialize all the arrays need to manage the board
    initGameBoard() {
        var tiles: string[][] = this.state.tiles;
        var columnSlots: number[] = this.state.nextTiles;
        var selectorsEnabled: boolean[] = this.state.selctorsEnabled;
        var row: number;
        var column: number;
        for (column = 0; column < BOARD_COLUMNS; column++) {
            selectorsEnabled.push(true);
            columnSlots.push(0);
            tiles.push([]);
            for (row = 0; row < BOARD_ROWS; row++) {
                tiles[column].push('white');
            }
        }
        this.setState({ tiles: tiles, nextTiles: columnSlots, selctorsEnabled: selectorsEnabled });
    }

    // Reset the board back to the startup state
    resetGameBoard() {
        var tiles: string[][] = this.state.tiles;
        var nextTiles: number[] = this.state.nextTiles;
        var selectorsEnabled: boolean[] = this.state.selctorsEnabled;
        var row: number;
        var column: number;
        for (column = 0; column < BOARD_COLUMNS; column++) {
            selectorsEnabled[column] = true;
            nextTiles[column] = 0;
            for (row = 0; row < BOARD_ROWS; row++) {
                tiles[column][row] = 'white';
            }
        }
        this.setState({ tiles: tiles, nextTiles: nextTiles, selctorsEnabled: selectorsEnabled });
    }

    // handle the chip drop of either player
    dropChip(column: number, chipColor: string): number {
        const tiles: string[][] = this.state.tiles;
        const nextTiles: number[] = this.state.nextTiles;
        const row: number = nextTiles[column];
        tiles[column][nextTiles[column]] = chipColor;
        nextTiles[column]++;
        this.setState({ tiles: tiles, nextTiles: nextTiles });
        if (nextTiles[column] >= BOARD_ROWS) {
            const selectorsEnabled = this.state.selctorsEnabled;
            selectorsEnabled[column] = false;
            this.setState({ selctorsEnabled: selectorsEnabled });
        }
        return row;
    }

    // respond to the click on a column button; aka the 'chip drop'
    handleColumnSelection(index: number) {
        var chipColor: string = YELLOW_COLOR_CODE;
        if ('RED' === this.props.playerColor) {
            chipColor = RED_COLOR_CODE;
        }
        const row: number = this.dropChip(index, chipColor) + 1;
        const locationCode: string = this.columnLetters[index] + row;
        this.props.onChipDrop(locationCode);
    }

    // update state based on the data from the external move hook
    processExternalMove(locationCode: string) {
        const column: number = this.columnLetters.indexOf(locationCode.substring(0, 1));
        var opponentColor = RED_COLOR_CODE;
        if ('RED' === this.props.playerColor) {
            opponentColor = YELLOW_COLOR_CODE;
        }
        this.dropChip(column, opponentColor)
    }

    renderSingeColumn(column: string[]) {
        const { classes } = this.props;
        const offset: number = column.length - 1;
        return column.map((color, i) => {
            return (
                <Tooltip title={this.props.enabled ? 'Hover over top of game board and click to drop a chip' : ''} enterDelay={1000}>
                    <Grid item className={classes.cellGrid}>
                        <GameTile color={column[offset - i]} tileSize={TILE_SIZE} />
                    </Grid>
                </Tooltip>
            );
        });
    }

    renderColumnSelector(index: number) {
        const { classes } = this.props;
        const selectorsEnabled = this.state.selctorsEnabled;
        var buttonStyle = classes.selectorButtonYellow
        if ('RED' === this.props.playerColor) {
            buttonStyle = classes.selectorButtonRed
        }
        return (
            <Grid item alignItems='center'>
                <IconButton disabled={!this.props.enabled || !selectorsEnabled[index]} className={buttonStyle} onClick={() => this.handleColumnSelection(index)}>
                    <ColumnIcon visibility='hidden' />
                </IconButton>
            </Grid>
        );
    }

    renderColumns() {
        const { classes } = this.props;
        return this.state.tiles.map((column, i) => {
            return (
                <Grid container className={classes.columnGrid}>
                    {this.renderColumnSelector(i)}
                    {this.renderSingeColumn(column)}
                </Grid >
            );
        });
    }

    render() {
        const { classes } = this.props;
        return (
            <Container component='div' >
                <Grid container className={classes.boardGrid}>
                    {this.renderColumns()}
                </Grid>
            </Container>
        );
    }

}

export default withStyles(Styles)(GameBoard);
