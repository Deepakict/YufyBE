import axios from 'axios';

export const sendBookingTelegramMessage = async (
  message: string,
  chatId: string = '-1002280289969',
  botToken: string = '1536376949:AAGXI7yw_h47TmkKrtko70oj_bfiJvdMbwo'
): Promise<void> => {
  try {
    const encodedMessage = encodeURIComponent(message);
    const url = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodedMessage}&parse_mode=HTML`;

    const response = await axios.get(url);

    if (response.status === 200) {
      console.log('✅ Telegram message sent.');
    } else {
      console.error('⚠️ Telegram send failed:', response.statusText);
    }
  } catch (err) {
    console.error('❌ Telegram error:', err instanceof Error ? err.message : err);
  }
};

export const sendOrderStatusTelegramMessage = async (
  message: string,
  chatId: string = '-1002357189155',
  botToken: string = '5225967476:AAFSY9SdxK_GBMEhTH7j1uxpAIFILgGgQro'
): Promise<void> => {
  try {
    const encodedMessage = encodeURIComponent(message);
    const url = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodedMessage}&parse_mode=HTML`;

    const response = await axios.get(url);

    if (response.status === 200) {
      console.log('✅ Telegram message sent.');
    } else {
      console.error('⚠️ Telegram send failed:', response.statusText);
    }
  } catch (err) {
    console.error('❌ Telegram error:', err instanceof Error ? err.message : err);
  }
};