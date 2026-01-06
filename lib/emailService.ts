import emailjs from '@emailjs/browser';

// Configuração do EmailJS
// IMPORTANTE: Substitua estas credenciais pelas suas após criar conta em https://www.emailjs.com/
const EMAILJS_CONFIG = {
  serviceId: 'service_lxelpqh', // Substitua com seu Service ID
  publicKey: 'vQQD08CqAu_cZ6mU3', // Substitua com sua Public Key
  templates: {
    newReservation: 'template_new_reservation', // Template para nova reserva
    statusUpdate: 'template_status_update', // Template para mudança de status
  }
};

// Inicializar EmailJS
emailjs.init(EMAILJS_CONFIG.publicKey);

interface ReservationEmailData {
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  startDate: string;
  endDate: string;
  guestsCount: number;
  totalPrice: string;
  status: string;
  voucherCode?: string;
  discount?: number;
}

/**
 * Enviar email de confirmação de nova reserva
 */
export async function sendNewReservationEmail(data: ReservationEmailData): Promise<boolean> {
  try {
    const nights = Math.ceil(
      (new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    const templateParams = {
      to_email: data.guestEmail,
      to_name: data.guestName,
      guest_name: data.guestName,
      guest_email: data.guestEmail,
      guest_phone: data.guestPhone || 'Não fornecido',
      check_in: new Date(data.startDate).toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }),
      check_out: new Date(data.endDate).toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }),
      nights: nights,
      guests_count: data.guestsCount,
      total_price: data.totalPrice,
      status: data.status === 'pending' ? 'Pendente de Confirmação' : 
              data.status === 'confirmed' ? 'Confirmada' : 'Cancelada',
      voucher_info: data.voucherCode 
        ? `Voucher aplicado: ${data.voucherCode} (-€${data.discount?.toFixed(2)})` 
        : 'Nenhum voucher aplicado',
      property_name: 'EnzoLoft',
      property_location: 'Vila Nova da Baronia, Évora',
      property_email: 'info@enzoloft.com',
    };

    console.log('Enviando email com config:', {
      serviceId: EMAILJS_CONFIG.serviceId,
      templateId: EMAILJS_CONFIG.templates.newReservation,
      params: templateParams
    });

    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templates.newReservation,
      templateParams
    );

    console.log('Email de nova reserva enviado com sucesso:', response);
    return response.status === 200;
  } catch (error: any) {
    console.error('Erro ao enviar email de nova reserva:', error);
    console.error('Detalhes do erro:', error.text || error.message);
    alert(`Erro ao enviar email: ${error.text || error.message || 'Erro desconhecido'}`);
    return false;
  }
}

/**
 * Enviar email de atualização de status da reserva
 */
export async function sendStatusUpdateEmail(data: ReservationEmailData): Promise<boolean> {
  try {
    const nights = Math.ceil(
      (new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    let statusMessage = '';
    let statusColor = '';
    
    if (data.status === 'confirmed') {
      statusMessage = 'Sua reserva foi CONFIRMADA! ✅';
      statusColor = 'green';
    } else if (data.status === 'cancelled') {
      statusMessage = 'Sua reserva foi CANCELADA. ❌';
      statusColor = 'red';
    }

    const templateParams = {
      to_email: data.guestEmail,
      to_name: data.guestName,
      guest_name: data.guestName,
      status_message: statusMessage,
      status_color: statusColor,
      check_in: new Date(data.startDate).toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }),
      check_out: new Date(data.endDate).toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }),
      nights: nights,
      guests_count: data.guestsCount,
      total_price: data.totalPrice,
      property_name: 'EnzoLoft',
      property_location: 'Vila Nova da Baronia, Évora',
      property_email: 'info@enzoloft.com',
      property_phone: '+351 XXX XXX XXX',
    };

    console.log('Enviando email de atualização com config:', {
      serviceId: EMAILJS_CONFIG.serviceId,
      templateId: EMAILJS_CONFIG.templates.statusUpdate,
      params: templateParams
    });

    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templates.statusUpdate,
      templateParams
    );

    console.log('Email de atualização enviado com sucesso:', response);
    return response.status === 200;
  } catch (error: any) {
    console.error('Erro ao enviar email de atualização:', error);
    console.error('Detalhes do erro:', error.text || error.message);
    alert(`Erro EmailJS: ${error.text || error.message || 'Verifique se os templates foram criados no EmailJS'}`);
    return false;
  }
}
