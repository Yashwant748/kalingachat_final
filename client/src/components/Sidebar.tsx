import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { Conversation } from "@shared/schema";
import RAGUploadDialog from "./RAGUploadDialog";
import { Link, useLocation } from "react-router-dom";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  conversations: Conversation[];
  currentConversationId: number | null;
  onSelectConversation: (id: number) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: number) => void;
  isCreating: boolean;
}

export default function Sidebar({
  isOpen,
  onToggle,
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isCreating
}: SidebarProps) {

  const { logout } = useAuth();
  const location = useLocation();
  const { toast } = useToast();

  const showDateToast = () => {
    const date = new Date().toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    toast({ title: "📅 Today's Date", description: date, duration: 6000 });
  };

  const showTimeToast = () => {
    const time = new Date().toLocaleTimeString();
    toast({ title: "🕐 Current Time", description: time, duration: 6000 });
  };

  const showWeatherToast = async () => {
    if (!navigator.onLine) {
      toast({
        title: "⛅ Weather Unavailable",
        description: "Please connect to the network.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }
    try {
      toast({ title: "⛅ Detecting location...", duration: 2000 });
      
      let lat = 28.6139; // Default New Delhi
      let lon = 77.2090;
      let locationName = "New Delhi (Default)";

      // Try to get real location
      if ("geolocation" in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { 
              enableHighAccuracy: true,
              timeout: 10000, 
              maximumAge: 0 
            });
          });
          lat = position.coords.latitude;
          lon = position.coords.longitude;
          locationName = "Current Location";
        } catch (geoErr) {
          console.warn("Geolocation denied/failed:", geoErr);
        }
      }

      toast({ title: "⛅ Fetching weather...", duration: 2000 });
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
      );
      if (!res.ok) throw new Error("Weather API failed");
      const data = await res.json();
      const temp = data.current_weather.temperature;
      const wind = data.current_weather.windspeed;
      const wmoMap: Record<number, string> = {
        0: "☀️ Clear Sky", 1: "🌤 Mainly Clear", 2: "⛅ Partly Cloudy",
        3: "☁️ Overcast", 45: "🌫 Foggy", 48: "🌫 Icy Fog",
        51: "🌦 Light Drizzle", 61: "🌧 Slight Rain", 71: "🌨 Slight Snow",
        80: "🌦 Rain Showers", 95: "⛈ Thunderstorm",
      };
      const condition = wmoMap[data.current_weather.weathercode] || `Code ${data.current_weather.weathercode}`;
      toast({
        title: `🌡 ${temp}°C — ${condition}`,
        description: `Wind: ${wind} km/h · ${locationName}`,
        duration: 8000,
      });
    } catch {
      toast({
        title: "Weather Unavailable",
        description: "Could not fetch live weather. Try again later.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50
        w-80 glass-panel border-r border-white/10
        transform transition-transform duration-300 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col shadow-2xl lg:shadow-none
      `}>
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3 group cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-all duration-300 group-hover:scale-105">
                <i className="fas fa-brain text-white text-lg" />
              </div>
              <div>
                <h2 className="font-orbitron font-bold text-xl tracking-tight text-foreground group-hover:text-primary transition-colors">
                  KalingaAI
                </h2>
                <p className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase">
                  Academic Jarvis v6
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="lg:hidden w-8 h-8 rounded-full hover:bg-white/10"
            >
              <i className="fas fa-times" />
            </Button>
          </div>

          {/* New Chat Button */}
          <Button
            onClick={onNewConversation}
            disabled={isCreating}
            className="w-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 h-11 rounded-xl font-medium hover:-translate-y-1"
          >
            <i className={`fas fa-plus mr-2 ${isCreating ? 'animate-spin' : ''}`} />
            {isCreating ? "Creating..." : "New Chat"}
          </Button>
        </div>

        {/* AI & Quick Tools Section (Collapsible) */}
        <div className="px-4 py-2 border-b border-white/10">
          <Accordion type="single" collapsible className="w-full space-y-1">
            
            <AccordionItem value="ai-tools" className="border-none">
              <AccordionTrigger className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:no-underline py-2 px-2 hover:bg-white/5 rounded-lg transition-colors">
                AI & PDF Tools
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-0 px-2 space-y-1">
                <Link
                  to="/tools/pdf-to-excel"
                  className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-xl transition-all ${location.pathname === '/tools/pdf-to-excel' ? 'bg-green-500/10 text-green-500 shadow-sm' : 'text-foreground hover:bg-white/5 hover:text-green-400'}`}
                  onClick={() => { if (window.innerWidth < 1024) onToggle(); }}
                >
                  <i className="fas fa-file-excel mr-3 opacity-70" /> PDF to Excel
                </Link>
                <Link
                  to="/tools/pdf-watermark"
                  className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-xl transition-all ${location.pathname === '/tools/pdf-watermark' ? 'bg-blue-500/10 text-blue-500 shadow-sm' : 'text-foreground hover:bg-white/5 hover:text-blue-400'}`}
                  onClick={() => { if (window.innerWidth < 1024) onToggle(); }}
                >
                  <i className="fas fa-tint mr-3 opacity-70" /> PDF Watermark
                </Link>
                <Link
                  to="/tools/pdf-merge"
                  className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-xl transition-all ${location.pathname === '/tools/pdf-merge' ? 'bg-orange-500/10 text-orange-500 shadow-sm' : 'text-foreground hover:bg-white/5 hover:text-orange-400'}`}
                  onClick={() => { if (window.innerWidth < 1024) onToggle(); }}
                >
                  <i className="fas fa-layer-group mr-3 opacity-70" /> PDF Merge
                </Link>
                <Link
                  to="/tools/pdf-split"
                  className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-xl transition-all ${location.pathname === '/tools/pdf-split' ? 'bg-red-500/10 text-red-500 shadow-sm' : 'text-foreground hover:bg-white/5 hover:text-red-400'}`}
                  onClick={() => { if (window.innerWidth < 1024) onToggle(); }}
                >
                  <i className="fas fa-cut mr-3 opacity-70" /> PDF Split
                </Link>
                <Link
                  to="/tools/pdf-rotate"
                  className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-xl transition-all ${location.pathname === '/tools/pdf-rotate' ? 'bg-pink-500/10 text-pink-500 shadow-sm' : 'text-foreground hover:bg-white/5 hover:text-pink-400'}`}
                  onClick={() => { if (window.innerWidth < 1024) onToggle(); }}
                >
                  <i className="fas fa-sync mr-3 opacity-70" /> PDF Rotate
                </Link>
                <Link
                  to="/tools/pdf-add-text"
                  className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-xl transition-all ${location.pathname === '/tools/pdf-add-text' ? 'bg-indigo-500/10 text-indigo-500 shadow-sm' : 'text-foreground hover:bg-white/5 hover:text-indigo-400'}`}
                  onClick={() => { if (window.innerWidth < 1024) onToggle(); }}
                >
                  <i className="fas fa-font mr-3 opacity-70" /> PDF Add Text
                </Link>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="quick-actions" className="border-none">
              <AccordionTrigger className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:no-underline py-2 px-2 hover:bg-white/5 rounded-lg transition-colors">
                Quick Actions
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-2 px-2 space-y-3">
                {/* Search Inputs */}
                <div className="space-y-2">
                  <div className="relative">
                    <i className="fab fa-google absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 text-xs" />
                    <input 
                      type="text" 
                      placeholder="Search Google..." 
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-muted-foreground/50"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          window.open(`https://google.com/search?q=${encodeURIComponent(e.currentTarget.value.trim())}`, "_blank");
                          e.currentTarget.value = "";
                          if (window.innerWidth < 1024) onToggle();
                        }
                      }}
                    />
                  </div>
                  <div className="relative">
                    <i className="fab fa-youtube absolute left-3 top-1/2 -translate-y-1/2 text-red-500 text-xs" />
                    <input 
                      type="text" 
                      placeholder="Search YouTube..." 
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-red-500/50 transition-colors placeholder:text-muted-foreground/50"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          window.open(`https://youtube.com/results?search_query=${encodeURIComponent(e.currentTarget.value.trim())}`, "_blank");
                          e.currentTarget.value = "";
                          if (window.innerWidth < 1024) onToggle();
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Instant Tools Grid */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                  <button
                    onClick={() => { window.open("https://google.com", "_blank"); if (window.innerWidth < 1024) onToggle(); }}
                    className="flex items-center justify-center px-2 py-2 text-xs font-medium rounded-lg text-foreground hover:bg-white/5 transition-all bg-black/20"
                  >
                    <i className="fab fa-google mr-1.5 text-blue-400" /> Open
                  </button>
                  <button
                    onClick={() => { window.open("https://youtube.com", "_blank"); if (window.innerWidth < 1024) onToggle(); }}
                    className="flex items-center justify-center px-2 py-2 text-xs font-medium rounded-lg text-foreground hover:bg-white/5 transition-all bg-black/20"
                  >
                    <i className="fab fa-youtube mr-1.5 text-red-500" /> Open
                  </button>
                  <button
                    onClick={showDateToast}
                    className="flex items-center px-2 py-2 text-xs font-medium rounded-lg text-foreground hover:bg-white/5 transition-all text-left bg-black/20"
                  >
                    <i className="fas fa-calendar mr-2 text-purple-400" /> Date
                  </button>
                  <button
                    onClick={showTimeToast}
                    className="flex items-center px-2 py-2 text-xs font-medium rounded-lg text-foreground hover:bg-white/5 transition-all text-left bg-black/20"
                  >
                    <i className="fas fa-clock mr-2 text-cyan-400" /> Time
                  </button>
                  <button
                    onClick={showWeatherToast}
                    className="flex items-center justify-center px-2 py-2 text-xs font-medium rounded-lg text-foreground hover:bg-white/5 transition-all bg-black/20 col-span-2"
                  >
                    <i className="fas fa-cloud-sun mr-2 text-yellow-400" /> Local Weather
                  </button>
                </div>
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-6 py-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recent Chats
            </h3>
          </div>

          <ScrollArea className="flex-1 px-4">
            <div className="space-y-1 pb-4">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`
                    group relative rounded-xl p-3 cursor-pointer transition-all duration-200 border border-transparent
                    flex items-center justify-between
                    ${currentConversationId === conversation.id
                      ? 'bg-primary/10 border-primary/20 shadow-sm translate-x-1'
                      : 'hover:bg-white/5 hover:border-white/10 hover:translate-x-1'
                    }
                  `}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <div className="flex-1 min-w-0 pr-8">
                    <p className={`text-sm font-medium truncate transition-colors ${currentConversationId === conversation.id ? 'text-primary' : 'text-foreground group-hover:text-foreground/90'
                      }`}>
                      {conversation.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                      {formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conversation.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <i className="fas fa-trash-alt text-xs" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 space-y-2 bg-black/5">
          <RAGUploadDialog />
          <Button
            onClick={logout}
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-white/5 h-10 rounded-xl transition-colors"
          >
            <i className="fas fa-sign-out-alt mr-3" />
            Sign Out
          </Button>
          <div className="text-[10px] text-muted-foreground/60 text-center font-medium py-2">
            Powered by TinyLLaMA
          </div>
        </div>
      </div>
    </>
  );
}