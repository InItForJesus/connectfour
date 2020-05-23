import React from 'react';
import { Theme, createStyles, Container, Grid, withStyles, Button, IconButton, Tooltip } from '@material-ui/core';
import GameTile from './GameTile';
import ColumnIcon from '@material-ui/icons/Details';

const tileSize: number = 65;
const boardRows: number = 7;
const boardColumns: number = 6;
const buttonHight: number = tileSize;
export const redColorCode: string = 'crimson';
export const yellowColorCode: string = 'gold';
export const gameBoardColor: string = 'DodgerBlue';

const Styles = (theme: Theme) =>
    createStyles({
        boardGrid: {
            width: tileSize * boardColumns,
            height: tileSize * boardRows + buttonHight
        },
        columnGrid: {
            width: tileSize,
            height: tileSize * boardRows + buttonHight
        },
        cellGrid: {
            width: tileSize,
            height: tileSize
        },
        selectorRowGrid: {
            width: tileSize * boardColumns,
            height: buttonHight
        },
        selectorButtonRed: {
            width: tileSize,
            height: tileSize,
            '&:hover': {
                background: redColorCode,
            }
        },
        selectorButtonYellow: {
            width: tileSize,
            height: tileSize,
            '&:hover': {
                background: yellowColorCode,
            }
        }
    });

type GameBoardProps = {
    playerColor: string // restrict to RED or YELLOW
    enabled: boolean;
    extrnalMove: string;
   // reset: boolean;
    onChipDrop: ((locationCode: string) => void);
    classes: {
        boardGrid: string;
        columnGrid: string;
        cellGrid: string;
        selectorRowGrid: string;
        selectorButtonRed: string;
        selectorButtonYellow: string;
    };
}

type GameBoardState = {
    tiles: string[][];
    columnSlots: number[];
    selctorsEnabled: boolean[];
}

class GameBoard extends React.Component<GameBoardProps, GameBoardState> {
    private columnLetters: string[] = ['A', 'B', 'C', 'D', 'E', 'F'];

    constructor(props: any) {
        super(props);
        this.state = {
            tiles: [],
            columnSlots: [],
            selctorsEnabled: [],
        };
        this.initGameBoard();
        this.handleColumnSelection = this.handleColumnSelection.bind(this); // TODO figure out what needs ot bind and what not
        this.dropChip = this.dropChip.bind(this);
        this.processExternalMove = this.processExternalMove.bind(this);

    }

    componentDidUpdate(prevProps: GameBoardProps) {
        if (prevProps.extrnalMove !== this.props.extrnalMove && '' !== this.props.extrnalMove) {
            this.processExternalMove(this.props.extrnalMove);
        }
        // if (!prevProps.reset && this.props.reset) {
        //     this.resetGameBoard();
        // }
    }

    initGameBoard() {
        var tiles = this.state.tiles;
        var columnSlots = this.state.columnSlots;
        var selectorsEnabled = this.state.selctorsEnabled;
        var row, column;
        for (column = 0; column < boardColumns; column++) {
            selectorsEnabled.push(true);
            columnSlots.push(0);
            tiles.push([]);
            for (row = 0; row < boardRows; row++) {
                tiles[column].push('white');
            }
        }
        this.setState({ tiles: tiles, columnSlots: columnSlots, selctorsEnabled: selectorsEnabled });
    }

    resetGameBoard() {
        var tiles = this.state.tiles;
        var columnSlots = this.state.columnSlots;
        var selectorsEnabled = this.state.selctorsEnabled;
        var row, column;
        for (column = 0; column < boardColumns; column++) {
            selectorsEnabled[column] = true;
            columnSlots[column] = 0;
            for (row = 0; row < boardRows; row++) {
                tiles[column][row] = 'white';
            }
        }
        this.setState({ tiles: tiles, columnSlots: columnSlots, selctorsEnabled: selectorsEnabled });
    }

    dropChip(column: number, chipColor: string): number {
        const tiles = this.state.tiles
        const columnSlots = this.state.columnSlots
        const row = columnSlots[column];
        tiles[column][columnSlots[column]] = chipColor;
        columnSlots[column]++;
        this.setState({ tiles: tiles, columnSlots: columnSlots });
        if (columnSlots[column] >= boardRows) {
            const selectorsEnabled = this.state.selctorsEnabled;
            selectorsEnabled[column] = false;
            this.setState({ selctorsEnabled: selectorsEnabled });
        }
        return row;
    }

    handleColumnSelection(index: number) {
        var chipColor: string = yellowColorCode;
        if ('RED' === this.props.playerColor) {
            chipColor = redColorCode;
        }
        const row: number = this.dropChip(index, chipColor) + 1;
        const locationCode: string = this.columnLetters[index] + row;
        this.props.onChipDrop(locationCode);
    }

    processExternalMove(locationCode: string) {
        const column: number = this.columnLetters.indexOf(locationCode.substring(0, 1));
        const row: number = parseInt(locationCode.substring(1)) - 1;
        console.log("user move location code " + locationCode + " is column " + column + " and row " + row);
        // TODO validate row??
        var opponentColor = redColorCode;
        if ('RED' === this.props.playerColor) {
            opponentColor = yellowColorCode;
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
                        <GameTile color={column[offset - i]} tileSize={tileSize} />
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
