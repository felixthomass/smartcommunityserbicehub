import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, User, CreditCard, Wrench, AlertCircle, QrCode, ArrowLeft, Sparkles } from 'lucide-react';
import { passService } from '../services/passService';
import { complaintService } from '../services/complaintService';
import { mongoService } from '../services/mongoService';
import { billService } from '../services/billService';
import { showSuccess, showError } from '../utils/sweetAlert';

import { aiService } from '../services/aiService';

const ResidentChatbot = ({ user, profile, setActiveTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, type: 'bot', text: `Hi ${user.name || 'there'}! I'm your Community Assistant powered by AI. How can I help you today?`, timestamp: new Date() }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [currentFlow, setCurrentFlow] = useState(null); // 'visitor', 'complaint', 'service'
  const [flowStep, setFlowStep] = useState(0);
  const [formData, setFormData] = useState({});
  const messagesEndRef = useRef(null);

  const quickActions = [
    { id: 'visitor', label: 'Visitor Pass', icon: <QrCode size={16} />, color: 'bg-purple-100 text-purple-700' },
    { id: 'complaint', label: 'Complaint', icon: <AlertCircle size={16} />, color: 'bg-red-100 text-red-700' },
    { id: 'service', label: 'Service Request', icon: <Wrench size={16} />, color: 'bg-blue-100 text-blue-700' },
    { id: 'billing', label: 'Billing Info', icon: <CreditCard size={16} />, color: 'bg-green-100 text-green-700' }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen, isTyping]);

  const addMessage = (text, type = 'user', isAction = false, actions = []) => {
    const newMessage = {
      id: Date.now() + Math.random(),
      type,
      text,
      isAction,
      actions,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  const showQuickActions = (msg = "Is there anything else I can help you with?") => {
    setTimeout(() => {
      addMessage(msg, 'bot', true, quickActions);
    }, 1000);
  };

  const callGemini = async (prompt) => {
    try {
      setIsTyping(true);
      
      const systemPrompt = `You are a helpful Community Assistant for a residential complex called 'Community Hub'. 
      The current resident is ${user.name || 'Resident'}. 
      You can help with:
      1. Creating Visitor Passes
      2. Filing Complaints
      3. Submitting Service Requests (Plumbing, Electrical, etc.)
      4. Checking Billing/Payments
      Keep your responses helpful, polite, and concise. 
      If a user asks for something you can't do, explain your capabilities.
      If a user wants to do one of the 4 things above, guide them to use the quick action buttons or tell them you'll start the process.`;

      const result = await aiService.generate(prompt, systemPrompt);

      if (!result.success) {
        throw new Error(result.error);
      }

      addMessage(result.text, 'bot');
    } catch (error) {
      console.error('AI Execution Error:', error);
      addMessage(error.message || "I'm having a bit of trouble connecting to my AI brain. How can I help you manually?", 'bot');
    } finally {
      setIsTyping(false);
      showQuickActions();
    }
  };

  const handleQuickAction = (action) => {
    addMessage(action.label, 'user');
    
    switch (action.id) {
      case 'visitor':
        setCurrentFlow('visitor');
        setFlowStep(1);
        setTimeout(() => addMessage("I'll help you create a visitor pass. What is the visitor's name?", 'bot'), 500);
        break;
      case 'complaint':
        setCurrentFlow('complaint');
        setFlowStep(1);
        setTimeout(() => addMessage("Please enter a title for your complaint (e.g., 'Leaking pipe').", 'bot'), 500);
        break;
      case 'service':
        setCurrentFlow('service');
        setFlowStep(1);
        setTimeout(() => addMessage("What kind of service do you need? (Plumbing, Electrical, Cleaning, etc.)", 'bot'), 500);
        break;
      case 'billing':
        handleBillingInfo();
        break;
      case 'tab':
        if (action.tab) setActiveTab(action.tab);
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const handleBillingInfo = async () => {
    setIsTyping(true);
    setTimeout(async () => {
      try {
        const summaryResult = await billService.getResidentBillSummary(user.id);
        setIsTyping(false);
        if (summaryResult.success) {
          const { totalPending } = summaryResult.data;
          addMessage(`Your current pending balance is ₹${totalPending || 0}.`, 'bot');
          if (totalPending > 0) {
            addMessage("Would you like to go to the payments page?", 'bot', true, [
              { id: 'tab', label: 'Go to Payments', tab: 'payments', color: 'bg-blue-600 text-white' }
            ]);
          }
        } else {
          addMessage("I couldn't fetch your billing info right now. Please try again later.", 'bot');
        }
      } catch (e) {
        setIsTyping(false);
        addMessage("Sorry, there was an error fetching your info.", 'bot');
      }
      showQuickActions();
    }, 1000);
  };

  const handleFlow = async (text) => {
    if (currentFlow === 'visitor') {
      if (flowStep === 1) {
        setFormData({ ...formData, visitorName: text });
        setFlowStep(2);
        addMessage("Got it. What is their phone number?", 'bot');
      } else if (flowStep === 2) {
        setFormData({ ...formData, visitorPhone: text });
        setFlowStep(3);
        addMessage("How many hours should the pass be valid for? (Default is 6)", 'bot');
      } else if (flowStep === 3) {
        const hours = parseInt(text) || 6;
        addMessage(`Creating pass for ${formData.visitorName} valid for ${hours} hours...`, 'bot');
        setIsTyping(true);
        try {
          const validUntil = new Date();
          validUntil.setHours(validUntil.getHours() + hours);

          const res = await passService.createPass({
            hostAuthUserId: user.id,
            hostName: user.name || '',
            hostPhone: profile?.phone || '',
            building: profile?.building || '',
            flatNumber: profile?.flatNumber || '',
            visitorName: formData.visitorName,
            visitorPhone: formData.visitorPhone,
            validUntil: validUntil.toISOString()
          });
          setIsTyping(false);
          if (res.success) {
            addMessage(`Visitor pass created successfully! Code: ${res.pass.code}`, 'bot');
            addMessage("You can view and share it from the Visitors tab.", 'bot', true, [
              { id: 'tab', label: 'View Pass', tab: 'visitors', color: 'bg-purple-600 text-white' }
            ]);
          } else {
            addMessage("Failed to create pass: " + (res.error || 'Unknown error'), 'bot');
          }
        } catch (e) {
          setIsTyping(false);
          addMessage("Error creating pass. Please try again later.", 'bot');
        }
        setCurrentFlow(null);
        setFlowStep(0);
        setFormData({});
        showQuickActions();
      }
    } else if (currentFlow === 'complaint') {
      if (flowStep === 1) {
        setFormData({ ...formData, title: text });
        setFlowStep(2);
        addMessage("Please provide more details about the complaint.", 'bot');
      } else if (flowStep === 2) {
        addMessage("Registering your complaint...", 'bot');
        setIsTyping(true);
        try {
          await complaintService.createComplaint({
            title: formData.title,
            description: text,
            category: 'general',
            priority: 'normal',
            residentAuthUserId: user.id,
            residentName: user.name || '',
            residentEmail: user.email || '',
            flatNumber: profile?.flatNumber || '',
            building: profile?.building || ''
          });
          setIsTyping(false);
          addMessage("Complaint registered successfully. Our team will look into it soon.", 'bot');
        } catch (e) {
          setIsTyping(false);
          addMessage("Could not register complaint. Please try again through the Complaints tab.", 'bot');
        }
        setCurrentFlow(null);
        setFlowStep(0);
        setFormData({});
        showQuickActions();
      }
    } else if (currentFlow === 'service') {
      if (flowStep === 1) {
        setFormData({ ...formData, category: text });
        setFlowStep(2);
        addMessage("Please describe the issue or work needed.", 'bot');
      } else if (flowStep === 2) {
        addMessage("Submitting service request...", 'bot');
        setIsTyping(true);
        try {
          const payload = {
            category: formData.category,
            priority: 'medium',
            description: text,
            building: profile?.building || '',
            flatNumber: profile?.flatNumber || '',
            residentAuthUserId: user.id,
            residentName: user.name || '',
            status: 'created',
            createdAt: new Date().toISOString()
          };
          const res = await mongoService.createServiceRequest(payload);
          setIsTyping(false);
          if (res.success) {
            addMessage("Service request submitted successfully! A staff member will be assigned shortly.", 'bot');
          } else {
            addMessage("Failed to submit request. Please try the Service Requests tab.", 'bot');
          }
        } catch (e) {
          setIsTyping(false);
          addMessage("Error submitting request. Please try again.", 'bot');
        }
        setCurrentFlow(null);
        setFlowStep(0);
        setFormData({});
        showQuickActions();
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const text = inputValue.trim();
    addMessage(text, 'user');
    setInputValue('');

    if (currentFlow) {
      handleFlow(text);
    } else {
      // Basic keyword matching for instant flows
      const low = text.toLowerCase();
      if (low.includes('pass') || low.includes('visitor')) {
        handleQuickAction({ id: 'visitor', label: 'Visitor Pass' });
      } else if (low.includes('complaint')) {
        handleQuickAction({ id: 'complaint', label: 'Complaint' });
      } else if (low.includes('service')) {
        handleQuickAction({ id: 'service', label: 'Service Request' });
      } else if (low.includes('bill') || low.includes('pay') || low.includes('due')) {
        handleQuickAction({ id: 'billing', label: 'Billing Info' });
      } else {
        // Use Gemini for everything else
        callGemini(text);
      }
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[999]">
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 group relative"
        >
          <MessageSquare className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
          <div className="absolute right-full mr-3 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg shadow-md text-xs font-medium text-gray-700 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Need help? Ask AI Assistant
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white dark:bg-gray-800 w-[350px] sm:w-[400px] h-[550px] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700 transition-all animate-in fade-in slide-in-from-bottom-10">
          {/* Header */}
          <div className="bg-blue-600 p-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5 text-blue-200" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Community Assistant</h3>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  <span className="text-[10px] text-blue-100">Powered by Gemini AI</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            {messages.map((msg, i) => (
              <div key={msg.id || i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.isAction ? (
                  <div className="flex flex-wrap gap-2 mt-2 max-w-[90%]">
                    {msg.actions.map(action => (
                      <button
                        key={action.id}
                        onClick={() => handleQuickAction(action)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105 active:scale-95 border ${action.color || 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm'}`}
                      >
                        {action.icon}
                        {action.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className={`max-w-[85%] p-3.5 rounded-2xl text-[13px] leading-relaxed ${
                    msg.type === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-200 dark:shadow-none' 
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-none shadow-sm border border-gray-100 dark:border-gray-700'
                  }`}>
                    {msg.text}
                    <div className={`text-[9px] mt-1.5 flex justify-end ${msg.type === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 dark:border-gray-700 flex gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
                </div>
              </div>
            )}
            {currentFlow && (
              <div className="flex justify-start pt-2">
                <button 
                  onClick={() => { 
                    setCurrentFlow(null); 
                    setFlowStep(0); 
                    setFormData({}); 
                    addMessage("Process cancelled. How else can I help?", 'bot'); 
                    showQuickActions();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <ArrowLeft size={10} /> Exit current flow
                </button>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
            {messages.length === 1 && !currentFlow && (
              <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto pb-2 scrollbar-none">
                {quickActions.map(action => (
                  <button
                    key={action.id}
                    onClick={() => handleQuickAction(action)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all hover:scale-105 active:scale-95 ${action.color}`}
                  >
                    {action.icon}
                    {action.label}
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={handleSubmit} className="relative flex items-center">
              <input
                type="text"
                placeholder={currentFlow ? "Enter details..." : "Ask me anything..."}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isTyping}
                className="w-full pl-4 pr-12 py-3 bg-gray-100 dark:bg-gray-700 border-none rounded-2xl text-[13px] focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className="absolute right-2 w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 transition-all disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed shadow-md shadow-blue-200 dark:shadow-none"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <p className="text-[9px] text-center text-gray-400 mt-2">
              Gemini AI may provide inaccurate info. Verify important details.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentChatbot;
