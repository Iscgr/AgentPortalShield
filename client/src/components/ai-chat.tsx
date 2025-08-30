import { useState } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export default function AiChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: '💡 پیشنهاد: ۷ نماینده دارای مطالبات معوق هستند. آیا می‌خواهید یادآوری ارسال کنم؟',
      sender: 'ai',
      timestamp: new Date()
    },
    {
      id: '2',
      content: '📊 تحلیل: درآمد این ماه ۸.۵% افزایش یافته. بیشترین فروش مربوط به نماینده "tech001" است.',
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const questionMutation = useMutation({
    mutationFn: async (question: string) => {
      console.log('🤖 AI Chat: Sending question to AI engine...');
      try {
        const response = await apiRequest('/api/ai-engine/question', { 
          method: 'POST', 
          body: JSON.stringify({ question }),
          headers: {
            'Content-Type': 'application/json'
          }
        });
        console.log('🤖 AI Chat: Response received:', response);
        return response;
      } catch (error) {
        console.error('🤖 AI Chat: Request failed:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('🤖 AI Chat: Processing successful response:', data);
      const aiMessage: Message = {
        id: Date.now().toString() + '-ai',
        content: data?.answer || data?.response || 'پاسخ دریافت شد اما محتوا خالی است.',
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    },
    onError: (error) => {
      console.error('🤖 AI Chat: Error occurred:', error);
      const errorMessage: Message = {
        id: Date.now().toString() + '-error',
        content: '⚠️ خطا در ارتباط با دستیار هوش مصنوعی. لطفاً دوباره تلاش کنید.',
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  });

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    questionMutation.mutate(inputMessage);
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-4">
      {/* AI Suggestions */}
      <div className="space-y-3">
        {messages.slice(0, 2).map((message) => (
          <div key={message.id} className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <p className="text-sm text-gray-700 dark:text-gray-300">{message.content}</p>
          </div>
        ))}
      </div>

      {/* Chat Messages */}
      {messages.length > 2 && (
        <ScrollArea className="h-48 border rounded-lg p-3">
          <div className="space-y-3">
            {messages.slice(2).map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-2 space-x-reverse ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div className={`flex items-start space-x-2 space-x-reverse max-w-[80%]`}>
                  {message.sender === 'ai' && (
                    <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                  )}
                  
                  <div
                    className={`px-3 py-2 rounded-lg text-sm ${
                      message.sender === 'user'
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    {message.content}
                  </div>
                  
                  {message.sender === 'user' && (
                    <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {questionMutation.isPending && (
              <div className="flex items-start space-x-2 space-x-reverse justify-start">
                <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg text-sm">
                  <div className="flex items-center space-x-1 space-x-reverse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>در حال تایپ...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Input Area */}
      <div className="flex space-x-2 space-x-reverse">
        <Input
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="سوال خود را بپرسید..."
          className="flex-1"
          disabled={questionMutation.isPending}
        />
        <Button 
          onClick={handleSendMessage}
          disabled={!inputMessage.trim() || questionMutation.isPending}
          className="bg-accent hover:bg-accent/90"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
