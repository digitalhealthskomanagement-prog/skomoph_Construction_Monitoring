import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Building2, Navigation } from "lucide-react";
import { Link } from "@tanstack/react-router";

// Fix leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
});

export function ProjectMap({ projects }: { projects: any[] }) {
  const [geoData, setGeoData] = useState<any>(null);

  useEffect(() => {
    // Fetch Sa Kaeo province boundaries (code 27)
    fetch("https://opendata-service.moph.go.th/gis/v1/geojson/2/27/")
      .then((res) => res.json())
      .then((data) => setGeoData(data))
      .catch((err) => console.error("Error fetching GeoJSON", err));
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden shadow-sm h-[500px] flex flex-col relative z-0">
      <div className="p-4 border-b bg-neutral-50 flex items-center justify-between">
        <h3 className="font-bold text-neutral-800 flex items-center gap-2">
          <Navigation className="w-5 h-5 text-primary" />
          แผนที่หน่วยบริการที่มีโครงการก่อสร้าง
        </h3>
      </div>
      <div className="flex-1">
        <MapContainer
          center={[13.824, 102.065]} // approximate center of Sa Kaeo
          zoom={9}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {geoData && (
            <GeoJSON
              data={geoData}
              style={{
                color: "#0ea5e9",
                weight: 2,
                opacity: 0.6,
                fillColor: "#0ea5e9",
                fillOpacity: 0.1,
              }}
            />
          )}
          {projects
            .filter((p) => p.lat && p.lng)
            .map((project) => (
              <Marker
                key={project.id}
                position={[project.lat, project.lng]}
                icon={customIcon}
              >
                <Popup>
                  <div className="p-1 min-w-[220px]">
                    <div className="text-[10px] font-bold text-primary mb-0.5 uppercase tracking-wider">{project.unit_type || "สสจ."}</div>
                    <div className="font-bold text-sm text-neutral-800 leading-tight mb-1">{project.unit_name}</div>
                    <div className="text-xs text-neutral-500 line-clamp-2 mb-3">{project.title}</div>
                    
                    <div className="space-y-2 text-xs text-neutral-600 mb-3 border-t pt-2">
                      <div className="flex justify-between items-center">
                        <span>ความคืบหน้า:</span>
                        <span className="font-bold text-primary">{project.total_progress}%</span>
                      </div>
                      <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-500" 
                          style={{ width: `${project.total_progress}%` }} 
                        />
                      </div>
                      {project.budget_baht != null && (
                        <div className="flex justify-between items-center pt-1">
                          <span>งบประมาณ:</span>
                          <span className="font-semibold text-neutral-800">{project.budget_baht.toLocaleString()} บ.</span>
                        </div>
                      )}
                    </div>

                    <Link
                      to={`/projects/${project.id}`}
                      className="w-full text-center block text-xs font-semibold py-2 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-colors no-underline!"
                    >
                      ดูรายละเอียดโครงการ →
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </div>
    </div>
  );
}
