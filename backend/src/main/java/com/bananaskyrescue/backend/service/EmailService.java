
package com.bananaskyrescue.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final String senderEmail;

    public EmailService(
            JavaMailSender mailSender,
            @Value("${spring.mail.username}") String senderEmail) {

        this.mailSender = mailSender;
        this.senderEmail = senderEmail;
    }

    public void sendVerificationOtp(String recipientEmail, String otp) {

        SimpleMailMessage message = new SimpleMailMessage();

        message.setFrom(senderEmail);
        message.setTo(recipientEmail);
        message.setSubject("Banana Sky Rescue - Email Verification");

        message.setText(
            "Welcome to Banana Sky Rescue!\n\n"
            + "Your email verification code is: " + otp + "\n\n"
            + "This code will expire in 5 minutes.\n\n"
            + "If you did not create an account, you can ignore this email.\n\n"
            + "Banana Sky Rescue Team"
        );

        mailSender.send(message);
    }
}
