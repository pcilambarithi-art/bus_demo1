import React, { useEffect, useRef, useState } from 'react';
import { X, Eye, MapPin, Compass } from 'lucide-react';
import type { BusStop } from '../types/bus';

interface StreetViewModalProps {
  stop: BusStop | null;
  onClose: () => void;
}

export const StreetViewModal: React.FC<StreetViewModalProps> = ({ stop, onClose }) => {
  const panoRef = useRef<HTMLDivElement | null>(null);
  const [hasStreetView, setHasStreetView] = useState<boolean | null>(null);

  useEffect(() => {
    if (!stop || !panoRef.current) return;
    const google = (window as any).google;
    if (!google?.maps) return;

    const svService = new google.maps.StreetViewService();
    const radius = 100; // Search within 100 meters

    svService.getPanorama(
      { location: { lat: stop.lat, lng: stop.lng }, radius, preference: google.maps.StreetViewPreference.NEAREST },
      (data: any, status: any) => {
        if (status === google.maps.StreetViewStatus.OK && data?.location?.latLng) {
          setHasStreetView(true);
          new google.maps.StreetViewPanorama(panoRef.current!, {
            position: data.location.latLng,
            pov: { heading: 165, pitch: 0 },
            zoom: 1,
            disableDefaultUI: false,
            showRoadLabels: true,
          });
        } else {
          setHasStreetView(false);
        }
      }
    );
  }, [stop]);

  if (!stop) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
      <div className="relative w-full max-w-2xl h-[70vh] rounded-3xl dark:bg-[#0B132B]/95 bg-white/95 dark:border-white/15 border-slate-200 border shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-white/10 border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base dark:text-white text-slate-900 leading-tight">
                  Google Street View 360°
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-400/30">
                  Stop #{stop.sequence}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-cyan-400" />
                <span>{stop.name}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full dark:text-slate-400 hover:text-white dark:hover:bg-white/10 text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Street View Panorama Container */}
        <div className="flex-1 w-full h-full relative bg-slate-950">
          <div ref={panoRef} className="w-full h-full" />

          {/* Fallback if Street View imagery is not captured at exact rural waypoint */}
          {hasStreetView === false && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 text-white">
              <Compass className="w-12 h-12 text-cyan-400 mb-3 animate-pulse" />
              <h4 className="font-bold text-base mb-1">Street View 360° Panorama</h4>
              <p className="text-xs text-slate-400 max-w-md mb-4">
                Google 360° imagery is currently being updated for this Chennai suburban waypoint ({stop.shortName}, Lat: {stop.lat.toFixed(4)}, Lng: {stop.lng.toFixed(4)}).
              </p>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300 font-mono">
                Scheduled Pickup: {stop.scheduledTime} • {stop.studentsWaiting} students waiting
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t dark:border-white/10 border-slate-200 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Google Maps Platform Street View Service</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl font-bold bg-cyan-500 text-black hover:bg-cyan-400 transition-all text-xs"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
