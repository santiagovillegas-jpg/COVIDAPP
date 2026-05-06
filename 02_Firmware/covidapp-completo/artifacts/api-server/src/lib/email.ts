import nodemailer from "nodemailer";

function createTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (user && pass) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }

  const host = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (host && smtpUser && smtpPass) {
    return nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: smtpUser, pass: smtpPass },
    });
  }

  console.warn("No email credentials configured. Set GMAIL_USER and GMAIL_APP_PASSWORD to enable email sending.");
  return null;
}

export async function sendAppointmentReminderEmail(
  toEmail: string,
  therapyType: string,
  appointmentDate: Date,
  therapistName?: string | null,
  patientName?: string | null,
): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      return { success: false, message: "El servicio de correo no está configurado. Configure GMAIL_USER y GMAIL_APP_PASSWORD." };
    }

    const dateStr = appointmentDate.toLocaleDateString("es-CO", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr = appointmentDate.toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const greeting = patientName ? `Estimado/a ${patientName}` : "Estimado/a paciente";
    const therapistInfo = therapistName
      ? `con el/la terapeuta <strong>${therapistName}</strong>`
      : "";

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #2d6a2d; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: #90ee90; margin: 0; font-size: 28px;">COVIDAPP</h1>
          <p style="color: #d4f4d4; margin: 5px 0 0 0; font-size: 14px;">Sistema de Gestión de Citas - COVIDA</p>
        </div>
        <div style="background-color: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0;">
          <h2 style="color: #333; margin-top: 0;">⏰ Recordatorio de Cita</h2>
          <p style="color: #555; font-size: 16px;">${greeting},</p>
          <p style="color: #555; font-size: 16px;">
            Le recordamos que tiene una cita programada de <strong style="color: #2d6a2d;">${therapyType}</strong>
            ${therapistInfo}
          </p>
          <div style="background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 16px; color: #333;">
              📅 <strong>Fecha:</strong> ${dateStr}<br>
              🕐 <strong>Hora:</strong> ${timeStr}
            </p>
          </div>
          <p style="color: #555; font-size: 14px;">
            Si necesita cancelar o reprogramar su cita, por favor contáctenos con anticipación.
          </p>
          <p style="color: #555; font-size: 14px;">
            📞 Teléfono: +57 301 123 4567<br>
            ✉️ Correo: contacto@covida.org
          </p>
        </div>
        <div style="background-color: #a6f0e0cc; padding: 15px; text-align: center; border-radius: 0 0 8px 8px;">
          <p style="margin: 0; color: #555; font-size: 12px;">
            © 2025 Universidad del Quindío | COVIDA - Armenia, Colombia
          </p>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"COVIDAPP" <${process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@covidapp.edu.co"}>`,
      to: toEmail,
      subject: `Recordatorio: ${therapyType} - COVIDAPP`,
      html: htmlBody,
      text: `${greeting}, le recordamos que tiene una cita de ${therapyType} ${therapistInfo} el ${dateStr} a las ${timeStr}. Contacto: +57 301 123 4567`,
    });

    console.log(`Reminder email sent: ${info.messageId}`);
    return { success: true, message: `Recordatorio enviado a ${toEmail}` };
  } catch (err) {
    console.error("Error sending reminder email:", err);
    return { success: false, message: `Error al enviar el correo: ${(err as Error).message}` };
  }
}

export async function sendMedicalHistoryUpdateEmail(
  toEmail: string,
  patientName: string,
  therapistName: string,
  changedFields: string[],
): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = createTransporter();
    if (!transporter) return { success: false, message: "Servicio de correo no configurado." };

    const fieldList = changedFields.map(f => `<li style="color:#555;">${f}</li>`).join("");

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #2d6a2d; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: #90ee90; margin: 0; font-size: 28px;">COVIDAPP</h1>
          <p style="color: #d4f4d4; margin: 5px 0 0 0; font-size: 14px;">Fundación COVIDA</p>
        </div>
        <div style="background-color: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0;">
          <h2 style="color: #333; margin-top: 0;">📋 Historial Médico Actualizado</h2>
          <p style="color: #555; font-size: 16px;">Estimado/a <strong>${patientName}</strong>,</p>
          <p style="color: #555; font-size: 16px;">
            El/la terapeuta <strong style="color: #2d6a2d;">${therapistName}</strong> ha actualizado los siguientes campos de tu historial médico:
          </p>
          <ul style="margin: 16px 0; padding-left: 24px;">${fieldList}</ul>
          <p style="color: #555; font-size: 14px;">
            Si tienes alguna pregunta o crees que hay un error, por favor comunícate con tu terapeuta o contáctanos.
          </p>
          <p style="color: #555; font-size: 14px;">
            📞 Teléfono: +57 301 123 4567<br>
            ✉️ Correo: contacto@covida.org
          </p>
        </div>
        <div style="background-color: #a6f0e0cc; padding: 15px; text-align: center; border-radius: 0 0 8px 8px;">
          <p style="margin: 0; color: #555; font-size: 12px;">© 2025 Universidad del Quindío | COVIDA - Armenia, Colombia</p>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"COVIDAPP" <${process.env.SMTP_FROM || process.env.GMAIL_USER || "noreply@covidapp.edu.co"}>`,
      to: toEmail,
      subject: "Tu historial médico fue actualizado - COVIDAPP",
      html: htmlBody,
      text: `Estimado/a ${patientName}, ${therapistName} ha actualizado tu historial médico (${changedFields.join(", ")}). Contacto: +57 301 123 4567`,
    });

    console.log(`Medical update email sent: ${info.messageId}`);
    return { success: true, message: `Notificación enviada a ${toEmail}` };
  } catch (err) {
    console.error("Error sending medical update email:", err);
    return { success: false, message: `Error: ${(err as Error).message}` };
  }
}

export async function sendErrorReportEmail(
  adminEmail: string,
  reporterName: string,
  reporterEmail: string,
  section: string,
  description: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = createTransporter();
    if (!transporter) return { success: false, message: "Servicio de correo no configurado." };

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #c0392b; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">⚠️ Reporte de Error - COVIDAPP</h1>
        </div>
        <div style="background-color: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0;">
          <p style="color: #555; font-size: 16px;"><strong>Reportado por:</strong> ${reporterName} (${reporterEmail})</p>
          <p style="color: #555; font-size: 16px;"><strong>Sección:</strong> ${section}</p>
          <div style="background-color: #fdecea; border-left: 4px solid #c0392b; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #333; font-size: 15px;"><strong>Descripción:</strong></p>
            <p style="margin: 8px 0 0 0; color: #555; font-size: 15px;">${description}</p>
          </div>
          <p style="color: #888; font-size: 12px;">Reportado el ${new Date().toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" })}</p>
        </div>
        <div style="background-color: #eee; padding: 15px; text-align: center; border-radius: 0 0 8px 8px;">
          <p style="margin: 0; color: #555; font-size: 12px;">© 2025 Universidad del Quindío | COVIDA</p>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"COVIDAPP" <${process.env.SMTP_FROM || process.env.GMAIL_USER || "noreply@covidapp.edu.co"}>`,
      to: adminEmail,
      subject: `[ERROR] ${section} — Reportado por ${reporterName}`,
      html: htmlBody,
      text: `Reporte de error por ${reporterName} (${reporterEmail}) en ${section}: ${description}`,
    });

    console.log(`Error report email sent: ${info.messageId}`);
    return { success: true, message: "Reporte enviado al administrador" };
  } catch (err) {
    console.error("Error sending error report email:", err);
    return { success: false, message: `Error: ${(err as Error).message}` };
  }
}
