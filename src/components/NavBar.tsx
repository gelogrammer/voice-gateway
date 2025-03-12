import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { MicIcon, Menu, X } from 'lucide-react';

const NavBar = () => {
  const { user, isAdmin, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const NavLinks = () => (
    <>
      {isAdmin ? (
        <>
        </>
      ) : (
        <>
        </>
      )}
    </>
  );

  const UserMenu = () => (
    <>
      {user ? (
        <div className="flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-4 md:items-center">
          <span className="text-sm text-gray-600 font-medium">{user.email}</span>
          <Button 
            variant="outline" 
            onClick={() => {
              logout();
              setIsOpen(false);
            }}
            className="w-full md:w-auto"
          >
            Logout
          </Button>
        </div>
      ) : (
        <div className="flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-3">
          <Link to="/login" className="w-full md:w-auto" onClick={() => setIsOpen(false)}>
            <Button variant="outline" className="w-full">Login</Button>
          </Link>
          <Link to="/register" className="w-full md:w-auto" onClick={() => setIsOpen(false)}>
            <Button className="w-full">Register</Button>
          </Link>
        </div>
      )}
    </>
  );

  return (
    <nav className="bg-white border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <MicIcon className="h-8 w-8 text-voice-blue" />
            <span className="text-xl font-semibold">talk.twah</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {user && <NavLinks />}
          </div>

          {/* Desktop User Menu */}
          <div className="hidden md:flex items-center">
            <UserMenu />
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-gray-100">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent 
                side="right" 
                className="w-full sm:w-[400px] p-0"
              >
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b">
                    <div className="flex items-center space-x-2">
                      <MicIcon className="h-6 w-6 text-voice-blue" />
                      <span className="font-semibold">Menu</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto">
                    <div className="p-4 space-y-6">
                      {user && (
                        <div className="space-y-1">
                          <NavLinks />
                        </div>
                      )}
                      <div className="pt-4 border-t">
                        <UserMenu />
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
