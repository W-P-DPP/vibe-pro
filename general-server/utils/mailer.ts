
import nodemailer from 'nodemailer';

class Mailer {
  private static transporter: nodemailer.Transporter;

  constructor(){}

  init(){
    Mailer.transporter = nodemailer.createTransport({
      host: process.env.MAILER_HOST,
      port: Number(process.env.MAILER_PORT),
      secure: process.env.MAILER_SECURE === 'true',
      auth: {
        user: process.env.MAILER_USER,
        pass: process.env.MAILER_PASS,
      },
    });
  }
  static getInstance(){
    if(!Mailer.transporter){
      this.init();
    }
    return Mailer.transporter;
  }
}