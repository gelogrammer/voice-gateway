
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import { MicIcon, BrainIcon, BarChartIcon, UsersIcon } from 'lucide-react';

const Index = () => {
  return (
    <div className="page-container">
      <NavBar />
      
      <div className="page-content">
        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden bg-gradient-to-b from-background to-secondary/30">
          <div className="container-tight relative z-10">
            <div className="text-center space-y-6 max-w-3xl mx-auto animate-fade-in">
              <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                Thesis Project
              </div>
              
              <h1 className="tracking-tight font-semibold">
                Real-Time Speech Rate and Emotion Feedback
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Using Deep Reinforcement Learning to analyze speech delivery and improve communication effectiveness.
              </p>
              
              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <Button size="lg" asChild>
                  <Link to="/register">Get Started</Link>
                </Button>
                
                <Button size="lg" variant="outline" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
              </div>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-1/2 left-0 w-full h-40 -translate-y-1/2 bg-primary/5 -rotate-3 -z-10"></div>
          <div className="absolute bottom-0 left-0 w-full h-px bg-border"></div>
        </section>
        
        {/* Features Section */}
        <section className="py-20 bg-background">
          <div className="container-tight">
            <div className="text-center mb-16 animate-slide-in">
              <h2 className="font-medium mb-4">Key Features</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Our platform leverages advanced AI technologies to provide insightful feedback on your speech.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="p-6 rounded-lg border border-border animate-slide-in shadow-sm hover:shadow-md transition-all">
                <div className="p-3 rounded-full bg-voice-blue/10 text-voice-blue w-fit mb-4">
                  <MicIcon size={24} />
                </div>
                <h3 className="text-xl font-medium mb-2">Voice Recording</h3>
                <p className="text-muted-foreground">
                  High-quality audio capture with easy upload and storage for analysis.
                </p>
              </div>
              
              <div className="p-6 rounded-lg border border-border animate-slide-in shadow-sm hover:shadow-md transition-all">
                <div className="p-3 rounded-full bg-voice-blue/10 text-voice-blue w-fit mb-4">
                  <BrainIcon size={24} />
                </div>
                <h3 className="text-xl font-medium mb-2">AI Analysis</h3>
                <p className="text-muted-foreground">
                  Advanced deep reinforcement learning algorithms analyze speech patterns in real-time.
                </p>
              </div>
              
              <div className="p-6 rounded-lg border border-border animate-slide-in shadow-sm hover:shadow-md transition-all">
                <div className="p-3 rounded-full bg-voice-blue/10 text-voice-blue w-fit mb-4">
                  <BarChartIcon size={24} />
                </div>
                <h3 className="text-xl font-medium mb-2">Detailed Insights</h3>
                <p className="text-muted-foreground">
                  Comprehensive feedback on speech rate, emotional tone, and delivery effectiveness.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* How It Works Section */}
        <section className="py-20 bg-gradient-to-b from-secondary/30 to-background">
          <div className="container-tight">
            <div className="text-center mb-16 animate-slide-in">
              <h2 className="font-medium mb-4">How It Works</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                A simple process to improve your communication skills
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Line connecting steps */}
              <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5 bg-border -z-10"></div>
              
              <div className="flex flex-col items-center text-center animate-slide-in">
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-voice-blue text-white text-lg font-bold mb-6 relative z-10">
                  1
                </div>
                <h3 className="text-xl font-medium mb-2">Record</h3>
                <p className="text-muted-foreground">
                  Record your speech using our high-quality voice recorder
                </p>
              </div>
              
              <div className="flex flex-col items-center text-center animate-slide-in">
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-voice-blue text-white text-lg font-bold mb-6 relative z-10">
                  2
                </div>
                <h3 className="text-xl font-medium mb-2">Analyze</h3>
                <p className="text-muted-foreground">
                  Our AI analyzes your speech patterns and emotional tone
                </p>
              </div>
              
              <div className="flex flex-col items-center text-center animate-slide-in">
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-voice-blue text-white text-lg font-bold mb-6 relative z-10">
                  3
                </div>
                <h3 className="text-xl font-medium mb-2">Improve</h3>
                <p className="text-muted-foreground">
                  Get actionable feedback to enhance your communication skills
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="py-20 bg-background border-t border-border">
          <div className="container-tight">
            <div className="max-w-3xl mx-auto bg-card rounded-xl p-10 shadow-md border border-border">
              <div className="text-center space-y-6">
                <h2 className="font-medium">Ready to improve your communication?</h2>
                <p className="text-xl text-muted-foreground">
                  Join our research study and contribute to the advancement of AI-powered speech analysis.
                </p>
                <Button size="lg" asChild>
                  <Link to="/register">Get Started Now</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
      
      <Footer />
    </div>
  );
};

export default Index;
