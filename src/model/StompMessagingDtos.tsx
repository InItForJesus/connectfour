//These MUST match the server DTOs
export class StartGameRequestDto {
    userId: string = '';
}

export class StartGameResponeDto {
    userId: string = '';
    gameId: number = 0;
    playerColor: string = ''; // TODO consider enumg
    goesFirst: string = '';
    waiting: boolean = false;    
}

export class MoveRequestDto {
    userId: string = '';
    gameId: number = 0;
    playerColor: string = '';
    chipLocation: string = '';
}

export class MoveResponseDto {
    userId: string = '';
    gameId: number = 0;
    chipLocation: string = ''
}

export class UserNotificationDto {
    userId: string = '';
    gameId: number = 0;
    type: string = '';
    message: string = '';
    isTerminal: boolean = false;
}