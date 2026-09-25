import React, { useState } from 'react';
import { HelpCircle, ChevronDown } from 'lucide-react';
import { sound } from '../utils/audio';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: 'Who is eligible to enter the SYSTECH 2K27 grid?',
    answer: 'Any enrolled undergraduate or postgraduate student across engineering, computer applications, information security, or sciences with a valid college ID card is eligible to participate.',
  },
  {
    question: 'Is there a registration fee for events?',
    answer: 'General symposium entry and event participation is completely free of charge. Access is sponsored by the department and industry partners. However, prior registration is mandatory to issue security clearance passes.',
  },
  {
    question: 'Can I participate in multiple events?',
    answer: 'Yes, as long as event timings do not overlap. For instance, you can participate in a morning event (CTF or Bug Hunt) and an afternoon event (Tech Debate or Cyber Quiz).',
  },
  {
    question: 'What hardware/software should I bring?',
    answer: 'Participants in technical tracks (CTF, Ethical Hacking, Bug Hunt) must bring their personal laptops equipped with Linux (Kali / Parrot / Ubuntu) or Windows with WSL, essential network tools (Burp Suite, Wireshark, Python 3), and chargers.',
  },
  {
    question: 'Will participants receive certificates and food?',
    answer: 'Yes! All confirmed attendees receive verified digital participation credentials, official SYSTECH 2K27 badges, breakfast refreshments, and lunch.',
  },
  {
    question: 'What if our college team has varying year levels?',
    answer: 'Inter-departmental and cross-year teams from the same institution are fully permitted for all team events.',
  }
];

export const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    sound.playClick();
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="relative py-20 bg-cyber-900/40 border-t border-cyber-cyan/10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10">
        
        <div className="flex flex-col items-center text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/25 text-cyber-cyan font-mono text-xs tracking-widest mb-3">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>KNOWLEDGE BASE // FAQ</span>
          </div>

          <h2 className="font-orbitron font-extrabold text-2xl sm:text-3xl md:text-4xl text-white tracking-tight">
            FREQUENTLY QUERIED <span className="text-cyber-cyan text-glow-cyan">PROTOCOLS</span>
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-cyber-cyan/15 bg-cyber-950/70 backdrop-blur-md overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => toggleFAQ(idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 text-white hover:text-cyber-cyan transition-colors"
                >
                  <span className="font-orbitron font-medium text-sm sm:text-base flex items-center gap-2.5">
                    <span className="text-cyber-cyan font-mono text-xs">0{idx + 1}.</span>
                    <span>{faq.question}</span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-cyber-cyan shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180 text-cyber-violet' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-slate-300 text-xs sm:text-sm font-sans leading-relaxed border-t border-white/5 animate-in fade-in duration-200">
                    <p className="pl-6 border-l border-cyber-cyan/30">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
