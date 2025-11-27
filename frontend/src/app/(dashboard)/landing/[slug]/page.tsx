
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { useUi } from '@/store/uiStore';

declare global {
  interface Window {
    grecaptcha?: {
      render: (container: HTMLElement, parameters: Record<string, any>) => number;
      reset: (opt_widget_id?: number) => void;
      ready: (cb: () => void) => void;
    };
  }
}

interface LandingPageData {
  id: number;
  title: string;
  content: string;
  description?: string;
  sections?: any[];
  settings?: any;
  campaign: {
    id: number;
    name: string;
  };
}

interface FormData {
  full_name: string;
  phone: string;
  email: string;
  country: string;
  city?: string;
}

interface LeadStreamEvent {
  lead?: {
    id?: number;
    full_name?: string;
    email?: string;
    phone?: string;
    source?: string;
  };
  campaignId?: number | null;
  country?: string;
  timestamp?: string;
  source?: string;
}

export default function LandingPage() {
  const params = useParams();
  const slug = params.slug as string;
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);
  const recaptchaWidgetIdRef = useRef<number | null>(null);
  const ui = useUi();

  const [landingPage, setLandingPage] = useState<LandingPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    phone: '',
    email: '',
    country: '',
    city: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [recentLeads, setRecentLeads] = useState<LeadStreamEvent[]>([]);
  const recaptchaEnabled = Boolean(recaptchaSiteKey);

  const initializeRecaptcha = useCallback(() => {
    if (!recaptchaEnabled || typeof window === 'undefined' || !window.grecaptcha) {
      return;
    }

    if (recaptchaWidgetIdRef.current !== null) {
      return;
    }

    window.grecaptcha.ready(() => {
      if (!recaptchaContainerRef.current || !recaptchaSiteKey) {
        return;
      }

      recaptchaWidgetIdRef.current = window.grecaptcha!.render(recaptchaContainerRef.current, {
        sitekey: recaptchaSiteKey,
        callback: (token: string) => {
          setRecaptchaToken(token);
          setRecaptchaError(null);
        },
        'expired-callback': () => {
          setRecaptchaToken('');
          setRecaptchaError('Verification expired. Please try again.');
        },
        'error-callback': () => {
          setRecaptchaToken('');
          setRecaptchaError('reCAPTCHA error. Please reload the widget.');
        },
      });
    });
  }, [recaptchaEnabled, recaptchaSiteKey]);

  useEffect(() => {
    fetchLandingPage();
  }, [slug]);

  useEffect(() => {
    if (!recaptchaEnabled) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    if (window.grecaptcha) {
      initializeRecaptcha();
      return;
    }

    const scriptId = 'google-recaptcha-v2-script';
    if (document.getElementById(scriptId)) {
      return;
    }

    const scriptElement = document.createElement('script');
    scriptElement.id = scriptId;
    scriptElement.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
    scriptElement.async = true;
    scriptElement.defer = true;
    scriptElement.onload = () => initializeRecaptcha();
    document.body.appendChild(scriptElement);

    return () => {
      scriptElement.onload = null;
    };
  }, [initializeRecaptcha, recaptchaEnabled]);

  useEffect(() => {
    if (!recaptchaEnabled) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    if (recaptchaWidgetIdRef.current !== null) {
      return;
    }
    if (window.grecaptcha && recaptchaContainerRef.current) {
      initializeRecaptcha();
    }
  }, [landingPage, initializeRecaptcha, recaptchaEnabled]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
    const socketInstance: Socket = io(socketUrl, {
      transports: ['websocket'],
    });

    socketRef.current = socketInstance;

    socketInstance.on('connect', () => setSocketConnected(true));
    socketInstance.on('disconnect', () => setSocketConnected(false));
    const handleLeadNew = (payload: LeadStreamEvent) => {
      if (!payload?.lead) {
        return;
      }
      setRecentLeads(prev => [payload, ...prev].slice(0, 5));
    };
    socketInstance.on('lead:new', handleLeadNew);

    return () => {
      socketInstance.off('lead:new', handleLeadNew);
      socketInstance.disconnect();
      socketRef.current = null;
    };
  }, []);

  const fetchLandingPage = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/landing/${slug}`);
      if (!response.ok) {
        throw new Error('Landing page not found');
      }
      const data = await response.json();
      setLandingPage(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load landing page');
    } finally {
      setLoading(false);
    }
  };

  const formatLeadTimestamp = (value?: string) => {
    try {
      if (!value) {
        return new Date().toLocaleTimeString();
      }
      return new Date(value).toLocaleTimeString();
    } catch {
      return new Date().toLocaleTimeString();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!landingPage) return;

    setSubmitting(true);
    try {
      if (recaptchaEnabled && !recaptchaToken) {
        setRecaptchaError('Please complete the verification.');
        setSubmitting(false);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leads/landing-page-submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          campaign_id: landingPage.campaign.id,
          recaptchaToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit form');
      }

      setSubmitted(true);
      setRecaptchaError(null);
      if (recaptchaEnabled && typeof window !== 'undefined' && window.grecaptcha && recaptchaWidgetIdRef.current !== null) {
        window.grecaptcha.reset(recaptchaWidgetIdRef.current);
      }
      setRecaptchaToken('');
    } catch (err) {
      ui.alert({
        title: 'Submission Failed',
        message: 'Failed to submit form. Please try again.',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !landingPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Page Not Found</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Thank You!</h2>
          <p className="text-gray-600">
            Your information has been submitted successfully. We'll be in touch soon!
          </p>
        </div>
      </div>
    );
  }
  
  // Helper function to render sections
  function renderSection(section: any) {
    switch (section.type) {
      case 'hero':
        return (
          <div className="text-center py-12" style={section.styles}>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {section.content.headline || 'Welcome to Our Service'}
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              {section.content.subheadline || 'We help businesses grow with innovative solutions'}
            </p>
            {section.content.ctaText && (
              <button className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700">
                {section.content.ctaText}
              </button>
            )}
          </div>
        );
  
      case 'features':
        return (
          <div style={section.styles}>
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
              {section.content.title || 'Why Choose Us?'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(section.content.features || []).map((feature: any, index: number) => (
                <div key={index} className="text-center">
                  <div className="text-4xl mb-4">{feature.icon || '🚀'}</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        );
  
      case 'contact_form':
        return (
          <div style={section.styles}>
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
              {section.content.title || 'Contact Us'}
            </h2>
            <p className="text-center text-gray-600 mb-6">
              {section.content.subtitle || 'Get in touch with us'}
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="full_name"
                  required
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Country *
                </label>
                <select
                  name="country"
                  required
                  value={formData.country}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Country</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="United Arab Emirates">United Arab Emirates</option>
                  <option value="Palestine">Palestine</option>
                  <option value="Israel">Israel</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {recaptchaEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Verification *
                  </label>
                  <div
                    ref={recaptchaContainerRef}
                    className="mt-2 flex justify-center"
                  />
                  {recaptchaError && (
                    <p className="mt-2 text-sm text-red-600">{recaptchaError}</p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>

              {recentLeads.length > 0 && (
                <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">Live lead feed</p>
                    <span
                      className={`text-xs font-medium ${socketConnected ? 'text-green-600' : 'text-gray-500'}`}
                    >
                      {socketConnected ? 'Live' : 'Offline'}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {recentLeads.map((leadEvent, index) => (
                      <li
                        key={`${leadEvent.lead?.id ?? index}-${leadEvent.timestamp ?? index}`}
                        className="rounded-md bg-white p-3 shadow-sm"
                      >
                        <p className="text-sm font-semibold text-slate-900">
                          {leadEvent.lead?.full_name || 'New lead'}
                        </p>
                        <p className="text-xs text-slate-600">
                          {(leadEvent.lead?.source || leadEvent.source || 'Landing Page')}{' '}
                          • {leadEvent.country || 'N/A'} • {formatLeadTimestamp(leadEvent.timestamp)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </form>
          </div>
        );
  
      case 'testimonials':
        return (
          <div style={section.styles}>
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
              {section.content.title || 'What Our Customers Say'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(section.content.testimonials || []).map((testimonial: any, index: number) => (
                <div key={index} className="bg-gray-50 p-6 rounded-lg">
                  <p className="text-gray-600 mb-4">"{testimonial.text}"</p>
                  <div className="font-semibold text-gray-900">{testimonial.author}</div>
                  <div className="text-sm text-gray-500">{testimonial.position}</div>
                </div>
              ))}
            </div>
          </div>
        );
  
      case 'pricing':
        return (
          <div style={section.styles}>
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
              {section.content.title || 'Pricing Plans'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(section.content.plans || []).map((plan: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6 text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="text-3xl font-bold text-blue-600 mb-4">{plan.price}</div>
                  <ul className="text-gray-600 mb-6">
                    {plan.features?.map((feature: string, idx: number) => (
                      <li key={idx} className="mb-1">• {feature}</li>
                    ))}
                  </ul>
                  <button className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
                    {plan.ctaText || 'Choose Plan'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
  
      case 'faq':
        return (
          <div style={section.styles}>
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
              {section.content.title || 'Frequently Asked Questions'}
            </h2>
            <div className="max-w-3xl mx-auto space-y-4">
              {(section.content.faqs || []).map((faq: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        );
  
      case 'footer':
        return (
          <div style={section.styles} className="border-t border-gray-200 pt-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">{section.content.companyName || 'Company'}</h3>
                <p className="text-gray-600">{section.content.description}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Contact</h3>
                <p className="text-gray-600">{section.content.email}</p>
                <p className="text-gray-600">{section.content.phone}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Links</h3>
                <ul className="space-y-2">
                  {(section.content.links || []).map((link: any, index: number) => (
                    <li key={index}>
                      <a href={link.url} className="text-blue-600 hover:text-blue-800">
                        {link.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );
  
      default:
        return (
          <div className="text-center text-gray-500 py-8">
            <p>{section.type} section</p>
          </div>
        );
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
  
  <header className="bg-white shadow">
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center">
      <h1 className="text-3xl font-bold text-gray-900">{landingPage.title}</h1>
      {landingPage.description && (
        <p className="mt-2 text-gray-600">{landingPage.description}</p>
      )}
    </div>
  </header>

  {/* Main Content - يظهر في وسط الشاشة */}
  <main className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-gray-50 px-4 py-8">
    <div className="w-full max-w-3xl">
      <div className="bg-white shadow-lg rounded-2xl p-8">
        {/* Content */}
        <div className="bg-white rounded-lg p-6">
          {landingPage.sections && landingPage.sections.length > 0 ? (
            <div className="space-y-8">
              {landingPage.sections.map((section: any, index: number) => (
                <div key={index} className="border-b border-gray-200 pb-8 last:border-b-0">
                  {renderSection(section)}
                </div>
              ))}
            </div>
          ) : (
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: landingPage.content }}
            />
          )}
        </div>
        {/* Form يمكن إضافته هنا */}
      </div>
    </div>
  </main>
</div>
  );
} 

