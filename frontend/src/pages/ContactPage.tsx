import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import type { PageType } from "../App";
import { Mail, Send, MessageSquare } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { PATHS } from "../navigation/paths";
import { submitContactForm, contactFormErrorMessage } from "../api/contact";
import { ApiError } from "../api/client";
import "../styles/contact.css";

interface ContactPageProps {
  onNavigate?: (page: PageType) => void;
}

export function ContactPage({ onNavigate }: ContactPageProps) {
  const { t } = useLanguage();
  const c = t.contactPage;
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      await submitContactForm({
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject,
        message: formData.message.trim(),
      });
      setSubmitted(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
      window.setTimeout(() => {
        setSubmitted(false);
      }, 4000);
    } catch (err) {
      const fallback = c.errorSend;
      let msg: string;
      if (err instanceof ApiError && err.status === 503) {
        const detail = err.message.trim();
        msg = detail ? `${c.errorUnavailable}\n${detail}` : c.errorUnavailable;
      } else {
        msg = contactFormErrorMessage(err, fallback);
      }
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const goToFaq = () => {
    navigate(PATHS.faq);
  };

  return (
    <PageLayout onNavigate={onNavigate}>
      <div className="contact-page">
        <div className="contact-content">
          <section className="contact-hero">
            <div className="contact-hero-container">
              <div className="contact-hero-icon">
                <MessageSquare className="icon-large" aria-hidden />
              </div>
              <h1 className="contact-hero-title">{c.heroTitle}</h1>
              <p className="contact-hero-subtitle">{c.heroSubtitle}</p>
            </div>
          </section>

          <section className="contact-main">
            <div className="contact-main-container">
              <div className="contact-grid">
                <div className="contact-info-section">
                  <h2 className="contact-info-title">{c.infoTitle}</h2>
                  <p className="contact-info-text">{c.infoIntro}</p>

                  <div className="contact-info-cards">
                    <div className="contact-info-card">
                      <div className="contact-info-icon contact-info-icon-blue">
                        <Mail aria-hidden />
                      </div>
                      <div>
                        <h3 className="contact-info-card-title">
                          {c.emailTitle}
                        </h3>
                        <p className="contact-info-card-text">
                          <a
                            href={`mailto:${c.emailAddress}`}
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            {c.emailAddress}
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="contact-response-time">
                    <h3 className="contact-response-title">
                      {c.responseTitle}
                    </h3>
                    <p className="contact-response-text">{c.responseText}</p>
                  </div>
                </div>

                <div className="contact-form-section">
                  <div className="contact-form-card">
                    <h2 className="contact-form-title">{c.formTitle}</h2>

                    {submitted ? (
                      <div className="contact-success">
                        <div className="contact-success-icon">
                          <Send aria-hidden />
                        </div>
                        <h3 className="contact-success-title">
                          {c.successTitle}
                        </h3>
                        <p className="contact-success-text">{c.successText}</p>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="contact-form">
                        <div className="contact-form-group">
                          <label htmlFor="contact-name" className="contact-form-label">
                            {c.labelName}
                          </label>
                          <input
                            type="text"
                            id="contact-name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="contact-form-input"
                            placeholder={c.placeholderName}
                            autoComplete="name"
                            required
                          />
                        </div>

                        <div className="contact-form-group">
                          <label htmlFor="contact-email" className="contact-form-label">
                            {c.labelEmail}
                          </label>
                          <input
                            type="email"
                            id="contact-email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="contact-form-input"
                            placeholder={c.placeholderEmail}
                            autoComplete="email"
                            required
                          />
                        </div>

                        <div className="contact-form-group">
                          <label htmlFor="contact-subject" className="contact-form-label">
                            {c.labelSubject}
                          </label>
                          <select
                            id="contact-subject"
                            name="subject"
                            value={formData.subject}
                            onChange={handleChange}
                            className="contact-form-select"
                            required
                          >
                            <option value="">{c.subjectPlaceholder}</option>
                            <option value="general">{c.subjectGeneral}</option>
                            <option value="support">{c.subjectSupport}</option>
                            <option value="billing">{c.subjectBilling}</option>
                            <option value="partnership">
                              {c.subjectPartnership}
                            </option>
                            <option value="feedback">{c.subjectFeedback}</option>
                            <option value="other">{c.subjectOther}</option>
                          </select>
                        </div>

                        <div className="contact-form-group">
                          <label htmlFor="contact-message" className="contact-form-label">
                            {c.labelMessage}
                          </label>
                          <textarea
                            id="contact-message"
                            name="message"
                            value={formData.message}
                            onChange={handleChange}
                            className="contact-form-textarea"
                            placeholder={c.placeholderMessage}
                            rows={6}
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          className="contact-form-button"
                          disabled={submitting}
                        >
                          <Send className="button-icon" aria-hidden />
                          {submitting ? c.sending : c.sendButton}
                        </button>
                        {submitError ? (
                          <p className="mt-3 text-sm text-destructive" role="alert">
                            {submitError}
                          </p>
                        ) : null}
                      </form>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="contact-faq-section">
            <div className="contact-faq-container">
              <h2 className="contact-faq-title">{c.faqSectionTitle}</h2>
              <p className="contact-faq-text">{c.faqSectionText}</p>
              <button type="button" className="contact-faq-button" onClick={goToFaq}>
                {c.faqButton}
              </button>
            </div>
          </section>
        </div>
      </div>
    </PageLayout>
  );
}
