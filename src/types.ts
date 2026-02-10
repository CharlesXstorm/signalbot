export interface TradeSignal {
    asset: string;
    direction: 'call' | 'put';
    duration: number; // in minutes
    triggerTime: string | null; // e.g., "07:20:00"
}

export interface POSocketMessage {
    action: string;
    data: any;
}