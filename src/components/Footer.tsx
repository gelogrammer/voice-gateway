import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="w-full py-6 bg-background border-t border-border">
      <div className="container-tight">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <h3 className="text-lg font-medium">talk.twah</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Real-Time Speech Rate and Emotion Feedback Using Deep Reinforcement Learning
            </p>
          </div>
          
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Development Team</h4>
            <ul className="space-y-2">
              <li className="text-sm text-muted-foreground">
                Angelo John S. Calleja
              </li>
              <li className="text-sm text-muted-foreground">
                Mico Banzuela
              </li>
              <li className="text-sm text-muted-foreground">
                Arian Allorde
              </li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              College of Science, Bicol University
            </p>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {currentYear} talk.twah. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
