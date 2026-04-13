export function crc16(payload: string): string {
    let crc = 0xFFFF;
    for (let c = 0; c < payload.length; c++) {
        crc ^= payload.charCodeAt(c) << 8;
        for (let i = 0; i < 8; i++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc = crc << 1;
            }
            crc &= 0xFFFF;
        }
    }
    const hex = crc.toString(16).toUpperCase();
    return hex.padStart(4, '0');
}

export function generatePixPayload(
    pixKey: string,
    merchantName: string,
    merchantCity: string,
    txid: string = '***',
    amount?: number
): string {
    const formatStr = (str: string, maxLength: number) => {
        // Remova acentos usando normalize para gerar um código válido
        const noAccents = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return noAccents.substring(0, maxLength);
    };

    const pad = (id: string, val: string) => {
        const length = String(val.length).padStart(2, '0');
        return `${id}${length}${val}`;
    };

    const gui = pad('00', 'br.gov.bcb.pix');
    const key = pad('01', pixKey);
    const merchantAccountInfo = pad('26', gui + key);

    const fName = formatStr(merchantName, 25);
    const fCity = formatStr(merchantCity, 15);

    let payload = '';
    payload += pad('00', '01'); // Payload Format Indicator
    payload += merchantAccountInfo;
    payload += pad('52', '0000'); // Merchant Category Code (0000 = padrão)
    payload += pad('53', '986'); // Transaction Currency (BRL)

    if (amount !== undefined && amount > 0) {
        const valStr = amount.toFixed(2);
        payload += pad('54', valStr);
    }

    payload += pad('58', 'BR'); // Country Code
    payload += pad('59', fName); // Merchant Name
    payload += pad('60', fCity); // Merchant City
    
    // Additional Data Field Template
    const txIdStr = pad('05', txid);
    payload += pad('62', txIdStr);

    payload += '6304';
    
    const crc = crc16(payload);
    return payload + crc;
}

export function getPixQrCodeUrl(payload: string): string {
    // Usar Google Charts API para gerar e retornar o QR Code como um link de imagem URL (muito mais fácil e sem dependências)
    return `https://chart.googleapis.com/chart?chs=400x400&cht=qr&chl=${encodeURIComponent(payload)}&choe=UTF-8&chld=M|0`;
}
