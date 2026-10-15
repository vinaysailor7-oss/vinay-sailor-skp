export type UnitSystem = 'mm' | 'cm' | 'm' | 'inch' | 'feet';

export interface ExtensionParameter {
  key: string;
  label: string;
  type: 'number' | 'boolean' | 'select' | 'string';
  default: number | boolean | string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: string | number }[];
  category?: string;
}

export interface ExtensionFileSet {
  registrarRb: string;   // e.g. su_extension_name.rb (in root)
  mainRb: string;          // e.g. su_extension_name/main.rb
  dialogHtml: string;      // e.g. su_extension_name/dialog.html
  dialogJs: string;        // e.g. su_extension_name/dialog.js
  dialogCss: string;       // e.g. su_extension_name/style.css
  readmeMd?: string;       // e.g. su_extension_name/README.md
}

export type GeometryType = 'stairs' | 'cutlist' | 'cabinet' | 'framing' | 'window' | 'pergola' | 'custom';

export interface SketchUpExtension {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  category: 'Architecture' | 'Woodworking & Fabrication' | 'BIM & Structure' | 'Interior & Millwork' | 'Parametric Modeling' | 'Utilities';
  icon: string; // Lucide icon identifier
  geometryType: GeometryType;
  parameters: ExtensionParameter[];
  files: ExtensionFileSet;
  tags: string[];
  features: string[];
}

export type ViewportStyle = 'sketchup_standard' | 'construction_monochrome' | 'blueprint_dark' | 'xray_translucent' | 'clay_shaded';
export type CameraPreset = 'iso' | 'top' | 'front' | 'right' | 'back' | 'left';

export interface ViewportStats {
  faces: number;
  edges: number;
  components: number;
  boundingBox: {
    width: number;
    height: number;
    depth: number;
    unit: string;
  };
}
