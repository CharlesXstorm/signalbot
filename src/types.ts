export interface TradeSignal {
    asset: string;
    direction: 'call' | 'put';
    duration: number; // in minutes
}

export interface POSocketMessage {
    action: string;
    data: any;
}