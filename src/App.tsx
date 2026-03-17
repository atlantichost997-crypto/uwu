/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { 
  Plus, 
  Trash2, 
  Globe, 
  LogOut, 
  Shield, 
  Activity, 
  ExternalLink,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Server
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Subdomain {
  id: string;
  name: string;
  full_domain: string;
  content: string;
  type: string;
  created_at: string;
  zone_name: string;
}

interface Zone {
  id: string;
  name: string;
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [subdomains, setSubdomains] = useState<Subdomain[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New Subdomain Form
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState('A');
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchSubdomains();
      fetchZones();
    }
  }, [user]);

  const fetchZones = async () => {
    try {
      const response = await fetch('/api/zones');
      const data = await response.json();
      if (response.ok) {
        setZones(data);
        if (data.length > 0) setSelectedZone(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching zones:', err);
    }
  };

  const fetchSubdomains = async () => {
    try {
      const response = await fetch(`/api/subdomains?userId=${user.id}`);
      const data = await response.json();
      if (response.ok) {
        setSubdomains(data);
      }
    } catch (err) {
      console.error('Error fetching subdomains:', err);
    }
  };

  const handleDiscordLogin = async () => {
    setAuthLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      setAuthLoading(false);
    }
  };

  const handleCreateSubdomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setSuccess(null);

    const zone = zones.find(z => z.id === selectedZone);
    if (!zone) {
      setError('Please select a domain');
      setCreating(false);
      return;
    }

    try {
      const response = await fetch('/api/subdomains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          content: newContent,
          type: newType,
          userId: user.id,
          zoneId: zone.id,
          zoneName: zone.name
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create');

      setSubdomains([data, ...subdomains]);
      setSuccess(`Subdomain ${data.full_domain} created successfully!`);
      setNewName('');
      setNewContent('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSubdomain = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subdomain?')) return;

    try {
      const response = await fetch(`/api/subdomains/${id}?userId=${user.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSubdomains(subdomains.filter(s => s.id !== id));
        setSuccess('Subdomain deleted successfully');
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  // Header Component
  const Header = () => (
    <nav className="glass-dark sticky top-0 z-50 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.2)] group cursor-pointer">
              <Server className="w-6 h-6 text-indigo-400 group-hover:scale-110 transition-transform" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tighter text-white">VoxelNode</span>
          </div>
          
          <div className="flex items-center gap-6">
            {!user ? (
              <button 
                onClick={handleDiscordLogin}
                className="glass border border-white/20 text-white text-sm font-bold px-8 py-3 rounded-2xl hover:bg-white/10 transition-all shadow-lg"
              >
                Sign In
              </button>
            ) : (
              <div className="flex items-center gap-5">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm text-zinc-200 font-semibold">{user.user_metadata.full_name || user.email}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em]">Discord Verified</span>
                  </div>
                </div>
                {user.user_metadata.avatar_url && (
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                    <img 
                      src={user.user_metadata.avatar_url} 
                      alt="Avatar" 
                      className="relative w-11 h-11 rounded-full border border-white/20 shadow-2xl"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <button 
                  onClick={() => supabase.auth.signOut()}
                  className="p-3 glass hover:bg-red-500/10 rounded-2xl transition-all text-zinc-400 hover:text-red-400 border-white/5"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );

  // Footer Component
  const Footer = () => (
    <footer className="bg-black/40 backdrop-blur-xl border-t border-white/5 py-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <Server className="w-6 h-6 text-indigo-400" />
              <span className="font-bold text-xl tracking-tighter text-white">VoxelNode</span>
            </div>
            <p className="text-zinc-500 max-w-sm leading-relaxed">
              The next generation of DNS management. Fast, secure, and reliable subdomain hosting powered by Cloudflare's global network.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Product</h4>
            <ul className="space-y-4 text-zinc-500 text-sm">
              <li><a href="#" className="hover:text-indigo-400 transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-indigo-400 transition-colors">API Reference</a></li>
              <li><a href="#" className="hover:text-indigo-400 transition-colors">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Legal</h4>
            <ul className="space-y-4 text-zinc-500 text-sm">
              <li><a href="#" className="hover:text-indigo-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-indigo-400 transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/5 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-zinc-600 text-xs">© 2026 VoxelNode. All rights reserved.</p>
          <div className="flex gap-6">
            <Globe className="w-4 h-4 text-zinc-700 hover:text-white cursor-pointer transition-colors" />
            <Shield className="w-4 h-4 text-zinc-700 hover:text-white cursor-pointer transition-colors" />
            <Activity className="w-4 h-4 text-zinc-700 hover:text-white cursor-pointer transition-colors" />
          </div>
        </div>
      </div>
    </footer>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] text-white selection:bg-indigo-500/30 font-sans overflow-x-hidden">
        <Header />
        
        {/* Animated Background Blobs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <motion.div 
            animate={{ 
              x: [0, 100, 0],
              y: [0, 50, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/20 blur-[120px] rounded-full opacity-50" 
          />
          <motion.div 
            animate={{ 
              x: [0, -80, 0],
              y: [0, 100, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/20 blur-[120px] rounded-full opacity-50" 
          />
        </div>

        {/* Hero Section */}
        <main className="relative z-10">
          <div className="relative pt-24 pb-32">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-5xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-white/5 border border-white/10 text-indigo-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-8 backdrop-blur-xl shadow-2xl">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                    VoxelNode v2.0 is here
                  </div>
                  
                  <h1 className="text-7xl md:text-[120px] font-display font-bold tracking-tighter mb-10 leading-[0.85] text-white">
                    DNS Management <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400">Reimagined.</span>
                  </h1>
                  
                  <p className="text-xl md:text-2xl text-zinc-400 mb-14 max-w-3xl mx-auto leading-relaxed font-light tracking-tight">
                    Deploy lightning-fast subdomains with enterprise-grade security. 
                    Powered by Cloudflare's global edge network.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleDiscordLogin}
                      disabled={authLoading}
                      className="w-full sm:w-auto bg-discord text-white font-bold px-12 py-5 rounded-2xl hover:bg-discord-hover transition-all flex items-center justify-center gap-4 shadow-[0_0_40px_rgba(88,101,242,0.4)] disabled:opacity-50 text-lg"
                    >
                      {authLoading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                        </svg>
                      )}
                      Get Started with Discord
                    </motion.button>
                    <button className="w-full sm:w-auto bg-white/5 backdrop-blur-2xl border border-white/10 text-white font-bold px-12 py-5 rounded-2xl hover:bg-white/10 transition-all text-lg shadow-xl">
                      Documentation
                    </button>
                  </div>
                </motion.div>
              </div>

              {/* Feature Grid */}
              <div className="grid md:grid-cols-3 gap-8 mt-48">
                {[
                  { icon: <Globe className="w-6 h-6" />, title: "Global Edge", desc: "Propagate records across 300+ edge locations instantly with sub-second latency." },
                  { icon: <Shield className="w-6 h-6" />, title: "Hardened Security", desc: "Enterprise-grade DDoS protection and automatic SSL/TLS for every subdomain." },
                  { icon: <Activity className="w-6 h-6" />, title: "Live Insights", desc: "Real-time traffic monitoring and DNS query analytics at your fingertips." }
                ].map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15, duration: 0.6 }}
                    className="glass p-10 rounded-[40px] hover:border-indigo-500/40 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-3xl rounded-full -mr-12 -mt-12 group-hover:bg-indigo-500/10 transition-colors" />
                    <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-8 border border-indigo-500/20 group-hover:scale-110 transition-transform shadow-lg">
                      <div className="text-indigo-400">{feature.icon}</div>
                    </div>
                    <h3 className="text-2xl font-display font-bold mb-4 text-white">{feature.title}</h3>
                    <p className="text-zinc-400 leading-relaxed font-light">{feature.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-indigo-500/30 font-sans">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        {/* Dashboard Background Blobs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full opacity-30" />
          <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full opacity-30" />
        </div>

        <div className="grid lg:grid-cols-3 gap-10">
          
          {/* Sidebar: Stats & Info */}
          <div className="space-y-8">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass p-10 rounded-[40px] shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full -mr-16 -mt-16" />
              <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-10 flex items-center gap-3">
                <Activity className="w-4 h-4 text-indigo-400" />
                Infrastructure Status
              </h2>
              <div className="space-y-8">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Active Records</span>
                    <p className="text-4xl font-display font-bold tracking-tighter text-white">{subdomains.length}</p>
                  </div>
                  <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 w-2/3 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                  </div>
                </div>
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Connected Zones</span>
                    <p className="text-4xl font-display font-bold tracking-tighter text-white">{zones.length}</p>
                  </div>
                  <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 w-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                  </div>
                </div>
                <div className="pt-8 border-t border-white/5 space-y-5">
                  <div className="flex items-center gap-3 text-[10px] text-indigo-400 font-bold uppercase tracking-widest">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                    Cloudflare Edge: Active
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-purple-400 font-bold uppercase tracking-widest">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                    Discord Session: Secure
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-indigo p-10 rounded-[40px] border-indigo-500/20"
            >
              <h2 className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                <Shield className="w-4 h-4" />
                Security Notice
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed font-light">
                All records are automatically proxied through Cloudflare. This hides your origin IP and provides built-in DDoS protection.
              </p>
            </motion.div>
          </div>

          {/* Main Content: Creator & List */}
          <div className="lg:col-span-2 space-y-10">
            
            {/* Creator Form */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass p-12 rounded-[40px] shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full -ml-32 -mt-32" />
              
              <h2 className="text-3xl font-display font-bold mb-10 flex items-center gap-4 text-white">
                <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
                  <Plus className="w-6 h-6 text-indigo-400" />
                </div>
                Create Subdomain
              </h2>
              
              <form onSubmit={handleCreateSubdomain} className="space-y-10 relative z-10">
                <div className="grid sm:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] ml-1">Target Domain</label>
                    <div className="relative group">
                      <select 
                        value={selectedZone}
                        onChange={(e) => setSelectedZone(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 focus:outline-none focus:border-indigo-500/50 transition-all appearance-none text-sm backdrop-blur-md group-hover:border-white/20"
                      >
                        {zones.map(zone => (
                          <option key={zone.id} value={zone.id} className="bg-[#0a0a0a]">{zone.name}</option>
                        ))}
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                        <Globe className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] ml-1">Record Type</label>
                    <select 
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 focus:outline-none focus:border-indigo-500/50 transition-all appearance-none text-sm backdrop-blur-md hover:border-white/20"
                    >
                      <option value="A" className="bg-[#0a0a0a]">A (IPv4)</option>
                      <option value="AAAA" className="bg-[#0a0a0a]">AAAA (IPv6)</option>
                      <option value="CNAME" className="bg-[#0a0a0a]">CNAME (Alias)</option>
                    </select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] ml-1">Subdomain Prefix</label>
                    <input 
                      type="text" 
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 focus:outline-none focus:border-indigo-500/50 transition-all text-sm backdrop-blur-md hover:border-white/20 placeholder:text-zinc-700"
                      placeholder="e.g. app"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] ml-1">Content / Value</label>
                    <input 
                      type="text" 
                      required
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 focus:outline-none focus:border-indigo-500/50 transition-all text-sm backdrop-blur-md hover:border-white/20 placeholder:text-zinc-700"
                      placeholder="e.g. 192.168.1.1"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6">
                  <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">
                    <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center border border-indigo-500/20">
                      <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    </div>
                    Cloudflare Proxy Enabled
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={creating || zones.length === 0}
                    className="w-full sm:w-auto bg-indigo-500 text-white font-bold px-12 py-5 rounded-2xl hover:bg-indigo-400 transition-all shadow-[0_0_30px_rgba(99,102,241,0.3)] disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
                  >
                    {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                    Deploy Record
                  </motion.button>
                </div>
              </form>

              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 32 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="bg-red-500/10 backdrop-blur-md border border-red-500/20 text-red-400 px-8 py-5 rounded-2xl text-sm flex items-center gap-4 overflow-hidden"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="font-medium">{error}</p>
                  </motion.div>
                )}

                {success && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 32 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="bg-indigo-500/10 backdrop-blur-md border border-indigo-500/20 text-indigo-400 px-8 py-5 rounded-2xl text-sm flex items-center gap-4 overflow-hidden"
                  >
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <p className="font-medium">{success}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Subdomain List */}
            <div className="space-y-8">
              <div className="flex items-center justify-between px-4">
                <h2 className="text-3xl font-display font-bold text-white">Active Deployments</h2>
                <div className="glass px-5 py-2 rounded-full border border-white/10 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">
                    {subdomains.length} Records
                  </span>
                </div>
              </div>
              
              <AnimatePresence mode="popLayout">
                {subdomains.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass border-dashed border-white/10 rounded-[40px] p-24 text-center"
                  >
                    <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-white/10">
                      <Globe className="w-10 h-10 text-zinc-700" />
                    </div>
                    <p className="text-zinc-500 font-medium text-lg">No active subdomains found.</p>
                    <p className="text-zinc-600 text-sm mt-2 font-light">Create your first record to see it here.</p>
                  </motion.div>
                ) : (
                  subdomains.map((sub, i) => (
                    <motion.div 
                      key={sub.id}
                      layout
                      initial={{ opacity: 0, y: 20, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.05 }}
                      className="glass p-10 rounded-[40px] hover:border-indigo-500/30 transition-all group relative overflow-hidden shadow-xl"
                    >
                      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 blur-[80px] rounded-full -mr-24 -mt-24 pointer-events-none group-hover:bg-indigo-500/10 transition-colors" />
                      
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative">
                        <div className="flex items-center gap-8">
                          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-indigo-500/30 transition-colors shadow-inner shrink-0">
                            <span className="text-sm font-bold text-indigo-400 font-display">{sub.type}</span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-4">
                              <h3 className="font-display font-bold text-2xl text-white tracking-tight">
                                {sub.full_domain}
                              </h3>
                              <a 
                                href={`http://${sub.full_domain}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="p-2 glass rounded-xl opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0 hover:text-indigo-400"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                            <div className="flex flex-wrap items-center gap-4">
                              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-black/40 border border-white/5">
                                <Activity className="w-3 h-3 text-zinc-500" />
                                <p className="text-xs text-zinc-400 font-mono tracking-tight">{sub.content}</p>
                              </div>
                              <div className="w-1 h-1 bg-zinc-800 rounded-full" />
                              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-black/40 border border-white/5">
                                <Globe className="w-3 h-3 text-zinc-500" />
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">
                                  {sub.zone_name}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => handleDeleteSubdomain(sub.id)}
                          className="p-5 glass hover:bg-red-500/10 text-zinc-600 hover:text-red-500 rounded-2xl transition-all border-white/5 shrink-0 self-end md:self-center"
                        >
                          <Trash2 className="w-6 h-6" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
