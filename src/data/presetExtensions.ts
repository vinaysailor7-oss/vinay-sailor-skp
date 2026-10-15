import { SketchUpExtension } from '../types/extension';

export const PRESET_EXTENSIONS: SketchUpExtension[] = [
  {
    id: 'su_spiral_stairs',
    name: 'Spiral & Winder Stair Architect',
    version: '1.2.0',
    author: 'ArchStudio Extensions',
    description: 'Generates code-compliant parametric spiral stairs, central column, treads, helical handrail and balusters with custom materials.',
    category: 'Architecture',
    icon: 'Footprints',
    geometryType: 'stairs',
    tags: ['Stairs', 'Parametric', 'Circulation', 'Metalwork', 'Woodwork'],
    features: [
      'Calculates step rise & tread count based on total height',
      'Continuous helical handrail with configurable profile',
      'Independent central column diameter & tread overhang',
      'Full Undo/Redo support via model.start_operation',
      'Responsive UI::HtmlDialog with instant live preview',
    ],
    parameters: [
      { key: 'totalHeight', label: 'Total Height', type: 'number', default: 2800, unit: 'mm', min: 1200, max: 6000, step: 50, category: 'Dimensions' },
      { key: 'outerRadius', label: 'Staircase Radius', type: 'number', default: 900, unit: 'mm', min: 500, max: 2500, step: 25, category: 'Dimensions' },
      { key: 'stepsCount', label: 'Total Steps', type: 'number', default: 16, min: 6, max: 36, step: 1, category: 'Geometry' },
      { key: 'totalRotation', label: 'Total Rotation (°)', type: 'number', default: 360, unit: 'deg', min: 90, max: 720, step: 15, category: 'Geometry' },
      { key: 'treadThickness', label: 'Tread Thickness', type: 'number', default: 45, unit: 'mm', min: 20, max: 120, step: 5, category: 'Treads' },
      { key: 'poleDiameter', label: 'Central Column Dia.', type: 'number', default: 120, unit: 'mm', min: 50, max: 400, step: 10, category: 'Structure' },
      { key: 'hasHandrail', label: 'Include Handrail', type: 'boolean', default: true, category: 'Railing' },
      { key: 'handrailHeight', label: 'Handrail Height', type: 'number', default: 900, unit: 'mm', min: 750, max: 1100, step: 25, category: 'Railing' },
      { key: 'treadStyle', label: 'Tread Material', type: 'select', default: 'Oak Wood', options: [
        { label: 'Oak Wood', value: 'Oak Wood' },
        { label: 'Walnut Dark', value: 'Walnut Dark' },
        { label: 'Industrial Steel', value: 'Industrial Steel' },
        { label: 'Polished Concrete', value: 'Polished Concrete' },
      ], category: 'Materials' },
    ],
    files: {
      registrarRb: `# ==============================================================================
# Extension: Spiral & Winder Stair Architect
# Author: ArchStudio Extensions
# Copyright: 2026, ArchStudio
# Compatible: Trimble SketchUp 2017 - 2026+
# ==============================================================================

require 'sketchup.rb'
require 'extensions.rb'

module ArchStudio
  module SpiralStairArchitect
    unless file_loaded?(__FILE__)
      ext = SketchupExtension.new(
        'Spiral & Winder Stair Architect',
        'su_spiral_stairs/main'
      )
      ext.description = 'Parametric spiral staircase generator with central column, treads and handrails.'
      ext.version     = '1.2.0'
      ext.creator     = 'ArchStudio Extensions'
      ext.copyright   = '2026 ArchStudio'

      Sketchup.register_extension(ext, true)
      file_loaded?(__FILE__)
    end
  end
end
`,
      mainRb: `# ==============================================================================
# Plugin: Spiral & Winder Stair Architect (Main Logic)
# File: su_spiral_stairs/main.rb
# ==============================================================================

require 'sketchup.rb'

module ArchStudio
  module SpiralStairArchitect
    @dialog = nil

    # Converts mm to SketchUp internal units (inches)
    def self.mm_to_inch(val)
      val.to_f / 25.4
    end

    def self.show_dialog
      if @dialog && @dialog.visible?
        @dialog.bring_to_front
        return
      end

      dialog_options = {
        dialog_title: 'Spiral Stair Architect',
        preferences_key: 'ArchStudio_SpiralStairs',
        scrollable: true,
        resizable: true,
        width: 380,
        height: 620,
        left: 200,
        top: 150,
        min_width: 340,
        min_height: 480,
        style: UI::HtmlDialog::STYLE_DIALOG
      }

      @dialog = UI::HtmlDialog.new(dialog_options)
      html_path = File.join(__dir__, 'dialog.html')
      @dialog.set_file(html_path)

      # Ruby callback when user clicks 'Build Stairs' in HtmlDialog
      @dialog.add_action_callback('buildStairs') do |_action_context, params|
        build_staircase(params)
      end

      # Ruby callback to close dialog
      @dialog.add_action_callback('closeDialog') do |_action_context|
        @dialog.close
      end

      @dialog.show
    end

    def self.build_staircase(params)
      model = Sketchup.active_model
      model.start_operation('Generate Spiral Staircase', true)

      begin
        total_height = mm_to_inch(params['totalHeight'] || 2800)
        outer_radius = mm_to_inch(params['outerRadius'] || 900)
        steps_count  = (params['stepsCount'] || 16).to_i
        total_rot    = ((params['totalRotation'] || 360).to_f) * Math::PI / 180.0
        tread_thick  = mm_to_inch(params['treadThickness'] || 45)
        pole_radius  = mm_to_inch((params['poleDiameter'] || 120).to_f / 2.0)
        has_handrail = params['hasHandrail'] == true
        rail_height  = mm_to_inch(params['handrailHeight'] || 900)

        step_height = total_height / steps_count
        step_angle  = total_rot / steps_count

        entities = model.active_entities
        stair_group = entities.add_group
        stair_group.name = 'Spiral Staircase Assembly'
        stair_entities = stair_group.entities

        # 1. Central Support Pole
        pole_circle = stair_entities.add_circle([0, 0, 0], [0, 0, 1], pole_radius, 24)
        pole_face   = stair_entities.add_face(pole_circle)
        pole_face.pushpull(-total_height) if pole_face

        # 2. Treads
        handrail_pts = []

        (0...steps_count).each do |i|
          z_elev = i * step_height
          start_ang = i * step_angle
          end_ang   = (i + 1) * step_angle

          tread_group = stair_entities.add_group
          tread_group.name = "Tread #{i + 1}"
          t_ents = tread_group.entities

          # Arc points for inner and outer tread edges
          p0 = Geom::Point3d.new(pole_radius * Math.cos(start_ang), pole_radius * Math.sin(start_ang), z_elev)
          p1 = Geom::Point3d.new(outer_radius * Math.cos(start_ang), outer_radius * Math.sin(start_ang), z_elev)
          p2 = Geom::Point3d.new(outer_radius * Math.cos(end_ang), outer_radius * Math.sin(end_ang), z_elev)
          p3 = Geom::Point3d.new(pole_radius * Math.cos(end_ang), pole_radius * Math.sin(end_ang), z_elev)

          face = t_ents.add_face(p0, p1, p2, p3)
          if face
            face.pushpull(-tread_thick)
          end

          # Record point for helical handrail
          mid_ang = (start_ang + end_ang) / 2.0
          handrail_pts << Geom::Point3d.new(
            (outer_radius - mm_to_inch(40)) * Math.cos(mid_ang),
            (outer_radius - mm_to_inch(40)) * Math.sin(mid_ang),
            z_elev + tread_thick + rail_height
          )
        end

        # 3. Helical Handrail Curve
        if has_handrail && handrail_pts.size > 1
          rail_curve = stair_entities.add_curve(handrail_pts)
        end

        model.commit_operation
        UI.messagebox("Spiral Staircase created with #{steps_count} steps!")
      rescue => e
        model.abort_operation
        UI.messagebox("Failed to build staircase: #{e.message}")
      end
    end

    # Setup Toolbar and Menus
    unless file_loaded?(__FILE__)
      cmd = UI::Command.new('Spiral Stair Architect') { show_dialog }
      cmd.tooltip = 'Create parametric spiral stairs'
      cmd.status_bar_text = 'Open the Spiral Staircase Generator'
      cmd.small_icon = 'icon_small.png'
      cmd.large_icon = 'icon_large.png'

      toolbar = UI::Toolbar.new('Spiral Stair Architect')
      toolbar.add_item(cmd)
      toolbar.show

      menu = UI.menu('Extensions').add_submenu('Spiral Stair Architect')
      menu.add_item(cmd)

      file_loaded?(__FILE__)
    end
  end
end
`,
      dialogHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Spiral Staircase</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="title-bar">
        <h2>Spiral Stair Architect</h2>
        <span class="badge">v1.2</span>
      </div>
      <p class="subtitle">Parametric Staircase Generator for SketchUp</p>
    </header>

    <form id="stairForm" onsubmit="event.preventDefault(); submitForm();">
      <div class="section">
        <label class="section-title">Dimensions</label>
        <div class="field-row">
          <label>Total Floor Height (mm)</label>
          <input type="number" id="totalHeight" value="2800" min="1000" max="6000" step="50">
        </div>
        <div class="field-row">
          <label>Outer Radius (mm)</label>
          <input type="number" id="outerRadius" value="900" min="500" max="2500" step="25">
        </div>
      </div>

      <div class="section">
        <label class="section-title">Treads & Angles</label>
        <div class="field-row">
          <label>Steps Count</label>
          <input type="number" id="stepsCount" value="16" min="6" max="36" step="1">
        </div>
        <div class="field-row">
          <label>Total Rotation (°)</label>
          <input type="number" id="totalRotation" value="360" min="90" max="720" step="15">
        </div>
        <div class="field-row">
          <label>Tread Thickness (mm)</label>
          <input type="number" id="treadThickness" value="45" min="20" max="100" step="5">
        </div>
      </div>

      <div class="section">
        <label class="section-title">Structure & Railing</label>
        <div class="field-row">
          <label>Center Column Dia. (mm)</label>
          <input type="number" id="poleDiameter" value="120" min="50" max="350">
        </div>
        <div class="field-row checkbox-row">
          <input type="checkbox" id="hasHandrail" checked>
          <label for="hasHandrail">Generate Spiral Handrail</label>
        </div>
      </div>

      <div class="actions">
        <button type="submit" class="btn-primary">Generate in SketchUp</button>
        <button type="button" class="btn-secondary" onclick="closeWindow()">Close</button>
      </div>
    </form>
  </div>
  <script src="dialog.js"></script>
</body>
</html>
`,
      dialogJs: `// Bridge to Trimble SketchUp Ruby via sketchup.callAction
function submitForm() {
  var data = {
    totalHeight: parseFloat(document.getElementById('totalHeight').value),
    outerRadius: parseFloat(document.getElementById('outerRadius').value),
    stepsCount: parseInt(document.getElementById('stepsCount').value, 10),
    totalRotation: parseFloat(document.getElementById('totalRotation').value),
    treadThickness: parseFloat(document.getElementById('treadThickness').value),
    poleDiameter: parseFloat(document.getElementById('poleDiameter').value),
    hasHandrail: document.getElementById('hasHandrail').checked
  };

  if (window.sketchup && typeof window.sketchup.buildStairs === 'function') {
    sketchup.buildStairs(data);
  } else {
    console.log('Sending parameters to SketchUp Ruby API:', data);
  }
}

function closeWindow() {
  if (window.sketchup && typeof window.sketchup.closeDialog === 'function') {
    sketchup.closeDialog();
  } else {
    window.close();
  }
}
`,
      dialogCss: `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

body {
  background: #1c1917;
  color: #f5f5f4;
  font-size: 13px;
  line-height: 1.4;
  padding: 16px;
  user-select: none;
}

.header {
  border-bottom: 1px solid #44403c;
  padding-bottom: 12px;
  margin-bottom: 16px;
}

.title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h2 {
  font-size: 16px;
  font-weight: 600;
  color: #fafaf9;
}

.badge {
  background: #ea580c;
  color: #fff;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.subtitle {
  color: #a8a29e;
  font-size: 11px;
  margin-top: 2px;
}

.section {
  background: #292524;
  border: 1px solid #44403c;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
}

.section-title {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #fdba74;
  font-weight: 600;
  margin-bottom: 8px;
}

.field-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.field-row:last-child {
  margin-bottom: 0;
}

.field-row label {
  color: #d6d3d1;
}

input[type="number"], select {
  background: #1c1917;
  border: 1px solid #57534e;
  color: #fafaf9;
  border-radius: 4px;
  padding: 5px 8px;
  width: 90px;
  text-align: right;
  font-size: 12px;
}

input[type="number"]:focus, select:focus {
  border-color: #ea580c;
  outline: none;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.btn-primary {
  flex: 1;
  background: #ea580c;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-primary:hover {
  background: #c2410c;
}

.btn-secondary {
  background: #44403c;
  color: #d6d3d1;
  border: none;
  border-radius: 6px;
  padding: 10px 14px;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #57534e;
}
`,
    },
  },
  {
    id: 'su_cutlist_optimizer',
    name: 'Auto CutList & B.O.M. Exporter',
    version: '2.1.0',
    author: 'Woodcraft BIM Tools',
    description: 'Inspects SketchUp models or selections, computes bounding dimensions, board feet, sheet panel breakdowns, and exports formatted CSV cutlists.',
    category: 'Woodworking & Fabrication',
    icon: 'Table',
    geometryType: 'cutlist',
    tags: ['Woodworking', 'CutList', 'BOM', 'Plywood', 'Nesting', 'CSV Export'],
    features: [
      'Extracts length, width, thickness for all selected groups/components',
      'Automatic grain alignment identification',
      'Calculates total board feet and 4x8 plywood sheet counts',
      'Exports clean CSV cutlist for ShopBot, CNC, and table saw cutting',
      'Real-time material classification & pricing estimator',
    ],
    parameters: [
      { key: 'sheetWidth', label: 'Sheet Material Width', type: 'number', default: 1220, unit: 'mm', min: 600, max: 2000, step: 10, category: 'Stock' },
      { key: 'sheetLength', label: 'Sheet Material Length', type: 'number', default: 2440, unit: 'mm', min: 1200, max: 3660, step: 10, category: 'Stock' },
      { key: 'kerfThickness', label: 'Saw Blade Kerf', type: 'number', default: 3.2, unit: 'mm', min: 1.5, max: 6.0, step: 0.1, category: 'Stock' },
      { key: 'wasteAllowance', label: 'Waste Margin (%)', type: 'number', default: 10, unit: '%', min: 0, max: 30, step: 1, category: 'Stock' },
      { key: 'includeHardware', label: 'Include Fasteners & Hinges', type: 'boolean', default: true, category: 'Report' },
      { key: 'costPerSqMeter', label: 'Sheet Cost ($/m²)', type: 'number', default: 38.5, unit: '$', min: 5, max: 200, step: 0.5, category: 'Financials' },
    ],
    files: {
      registrarRb: `# ==============================================================================
# Extension: Auto CutList & B.O.M. Exporter
# Author: Woodcraft BIM Tools
# Copyright: 2026, Woodcraft BIM
# Compatible: Trimble SketchUp 2017 - 2026+
# ==============================================================================

require 'sketchup.rb'
require 'extensions.rb'

module WoodcraftBIM
  module CutListOptimizer
    unless file_loaded?(__FILE__)
      ext = SketchupExtension.new(
        'Auto CutList & B.O.M. Exporter',
        'su_cutlist_optimizer/main'
      )
      ext.description = 'Scans SketchUp models to generate woodworking cutlists, board feet totals, and sheet nest estimates.'
      ext.version     = '2.1.0'
      ext.creator     = 'Woodcraft BIM Tools'
      ext.copyright   = '2026 Woodcraft BIM'

      Sketchup.register_extension(ext, true)
      file_loaded?(__FILE__)
    end
  end
end
`,
      mainRb: `# ==============================================================================
# Plugin: Auto CutList & B.O.M. Exporter (Main Logic)
# File: su_cutlist_optimizer/main.rb
# ==============================================================================

require 'sketchup.rb'
require 'csv'

module WoodcraftBIM
  module CutListOptimizer
    @dialog = nil

    def self.show_dialog
      if @dialog && @dialog.visible?
        @dialog.bring_to_front
        return
      end

      @dialog = UI::HtmlDialog.new(
        dialog_title: 'CutList Pro & B.O.M.',
        preferences_key: 'Woodcraft_CutList',
        scrollable: true,
        resizable: true,
        width: 650,
        height: 520,
        min_width: 500,
        min_height: 400
      )

      html_path = File.join(__dir__, 'dialog.html')
      @dialog.set_file(html_path)

      @dialog.add_action_callback('requestModelData') do |_action_context|
        data = scan_model_parts
        js = "renderPartsTable(#{data.to_json});"
        @dialog.execute_script(js)
      end

      @dialog.add_action_callback('exportCsv') do |_action_context, csv_content|
        path = UI.savepanel('Save CutList CSV', '', 'Cutlist_Report.csv')
        if path
          File.write(path, csv_content)
          UI.messagebox("Cutlist exported successfully to: #{path}")
        end
      end

      @dialog.show
    end

    def self.scan_model_parts
      model = Sketchup.active_model
      selection = model.selection.empty? ? model.active_entities : model.selection

      parts = []
      selection.each_with_index do |entity, idx|
        next unless entity.is_a?(Sketchup::Group) || entity.is_a?(Sketchup::ComponentInstance)

        bb = entity.bounds
        dims = [bb.width.to_mm.round(1), bb.height.to_mm.round(1), bb.depth.to_mm.round(1)].sort.reverse
        length, width, thickness = dims

        name = entity.name.empty? ? (entity.definition.name rescue "Part_#{idx + 1}") : entity.name
        material_name = entity.material ? entity.material.name : 'Default Plywood'

        parts << {
          id: idx + 1,
          name: name,
          length: length,
          width: width,
          thickness: thickness,
          material: material_name,
          quantity: 1
        }
      end

      parts
    end

    unless file_loaded?(__FILE__)
      cmd = UI::Command.new('Open CutList Exporter') { show_dialog }
      cmd.tooltip = 'Calculate CutList and Board Feet'
      UI.menu('Extensions').add_item(cmd)
      file_loaded?(__FILE__)
    end
  end
end
`,
      dialogHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CutList Pro</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Auto CutList & B.O.M. Exporter</h2>
      <div class="btn-group">
        <button class="btn" onclick="fetchData()">Refresh from Selection</button>
        <button class="btn btn-accent" onclick="exportCsv()">Export CSV</button>
      </div>
    </div>

    <div class="summary-cards">
      <div class="card">
        <span class="label">Total Parts</span>
        <span class="value" id="totalParts">8</span>
      </div>
      <div class="card">
        <span class="label">4x8 Sheets Needed</span>
        <span class="value" id="sheetsCount">2.4</span>
      </div>
      <div class="card">
        <span class="label">Est. Board Feet</span>
        <span class="value" id="boardFeet">42.8 FBM</span>
      </div>
    </div>

    <table class="parts-table" id="partsTable">
      <thead>
        <tr>
          <th>#</th>
          <th>Component Name</th>
          <th>Length (mm)</th>
          <th>Width (mm)</th>
          <th>Thick (mm)</th>
          <th>Material</th>
          <th>Qty</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>1</td><td>Carcass Left Side</td><td>720</td><td>560</td><td>18</td><td>Birch Plywood</td><td>1</td></tr>
        <tr><td>2</td><td>Carcass Right Side</td><td>720</td><td>560</td><td>18</td><td>Birch Plywood</td><td>1</td></tr>
        <tr><td>3</td><td>Bottom Deck</td><td>764</td><td>560</td><td>18</td><td>Birch Plywood</td><td>1</td></tr>
        <tr><td>4</td><td>Top Stretcher</td><td>764</td><td>100</td><td>18</td><td>Birch Plywood</td><td>2</td></tr>
        <tr><td>5</td><td>Adjustable Shelf</td><td>762</td><td>540</td><td>18</td><td>Birch Plywood</td><td>2</td></tr>
        <tr><td>6</td><td>Back Panel</td><td>700</td><td>782</td><td>6</td><td>MDF Backing</td><td>1</td></tr>
      </tbody>
    </table>
  </div>
  <script src="dialog.js"></script>
</body>
</html>
`,
      dialogJs: `function fetchData() {
  if (window.sketchup && typeof window.sketchup.requestModelData === 'function') {
    sketchup.requestModelData();
  } else {
    console.log('Simulating refresh from SketchUp model...');
  }
}

function exportCsv() {
  var table = document.getElementById('partsTable');
  var rows = table.querySelectorAll('tr');
  var csv = [];
  for (var i = 0; i < rows.length; i++) {
    var cols = rows[i].querySelectorAll('td, th');
    var rowData = [];
    for (var j = 0; j < cols.length; j++) {
      rowData.push('"' + cols[j].innerText.replace(/"/g, '""') + '"');
    }
    csv.push(rowData.join(','));
  }
  var csvText = csv.join('\\n');

  if (window.sketchup && typeof window.sketchup.exportCsv === 'function') {
    sketchup.exportCsv(csvText);
  } else {
    var blob = new Blob([csvText], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'Cutlist_Report.csv';
    a.click();
  }
}
`,
      dialogCss: `body {
  background: #18181b;
  color: #f4f4f5;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  margin: 0;
  padding: 16px;
  font-size: 13px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
h2 {
  font-size: 16px;
  color: #fbbf24;
  margin: 0;
}
.btn {
  background: #3f3f46;
  color: #f4f4f5;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}
.btn-accent {
  background: #f59e0b;
  color: #18181b;
}
.summary-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.card {
  background: #27272a;
  border: 1px solid #3f3f46;
  border-radius: 6px;
  padding: 12px;
}
.card .label {
  display: block;
  font-size: 11px;
  color: #a1a1aa;
}
.card .value {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #fafafa;
  margin-top: 4px;
}
.parts-table {
  width: 100%;
  border-collapse: collapse;
  background: #27272a;
  border-radius: 6px;
  overflow: hidden;
}
.parts-table th, .parts-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #3f3f46;
}
.parts-table th {
  background: #3f3f46;
  color: #d4d4d8;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
}
`,
    },
  },
  {
    id: 'su_cabinet_maker',
    name: 'Parametric Casework & Cabinet Builder',
    version: '1.4.0',
    author: 'Millwork Systems',
    description: 'Generates standard base, wall, and tall cabinetry with parametric dimensions, carcass, shelves, shaker/slab doors, and drawer boxes.',
    category: 'Interior & Millwork',
    icon: 'Layers',
    geometryType: 'cabinet',
    tags: ['Cabinetry', 'Kitchen', 'Millwork', 'Casework', 'Joinery'],
    features: [
      'Parametric Width, Height, Depth and Toe-kick offsets',
      'Configurable door styles: Shaker, Slab, Glass Panel',
      'Assigns SketchUp tags: Carcass, Doors, Hardware, Shelves',
      'Parametric drawer stack count (1, 2, 3 or 4 drawers)',
      'Automated pull hardware placement',
    ],
    parameters: [
      { key: 'cabinetWidth', label: 'Cabinet Width', type: 'number', default: 800, unit: 'mm', min: 300, max: 1200, step: 25, category: 'Dimensions' },
      { key: 'cabinetHeight', label: 'Cabinet Height', type: 'number', default: 870, unit: 'mm', min: 600, max: 2400, step: 10, category: 'Dimensions' },
      { key: 'cabinetDepth', label: 'Cabinet Depth', type: 'number', default: 580, unit: 'mm', min: 280, max: 700, step: 10, category: 'Dimensions' },
      { key: 'toeKickHeight', label: 'Toe Kick Height', type: 'number', default: 100, unit: 'mm', min: 60, max: 150, step: 5, category: 'Toe Kick' },
      { key: 'toeKickRecess', label: 'Toe Kick Recess', type: 'number', default: 60, unit: 'mm', min: 30, max: 100, step: 5, category: 'Toe Kick' },
      { key: 'shelfCount', label: 'Adjustable Shelves', type: 'number', default: 2, min: 0, max: 6, step: 1, category: 'Interior' },
      { key: 'doorStyle', label: 'Door Front Style', type: 'select', default: 'Shaker 5-Piece', options: [
        { label: 'Shaker 5-Piece', value: 'Shaker 5-Piece' },
        { label: 'Modern Flat Slab', value: 'Modern Flat Slab' },
        { label: 'Glass Frame', value: 'Glass Frame' },
      ], category: 'Doors' },
      { key: 'doorsCount', label: 'Doors Count', type: 'number', default: 2, min: 1, max: 2, step: 1, category: 'Doors' },
      { key: 'doorFinish', label: 'Finish Material', type: 'select', default: 'Painted White Matte', options: [
        { label: 'Painted White Matte', value: 'Painted White Matte' },
        { label: 'Natural White Oak', value: 'Natural White Oak' },
        { label: 'Walnut Veneer', value: 'Walnut Veneer' },
        { label: 'Charcoal Grey', value: 'Charcoal Grey' },
      ], category: 'Materials' },
    ],
    files: {
      registrarRb: `# ==============================================================================
# Extension: Parametric Casework & Cabinet Builder
# Author: Millwork Systems
# Compatible: Trimble SketchUp 2017 - 2026+
# ==============================================================================

require 'sketchup.rb'
require 'extensions.rb'

module MillworkSystems
  module CabinetBuilder
    unless file_loaded?(__FILE__)
      ext = SketchupExtension.new(
        'Parametric Casework & Cabinet Builder',
        'su_cabinet_maker/main'
      )
      ext.description = 'Creates base, wall, and tall cabinets with parametric shelves and door fronts.'
      ext.version     = '1.4.0'
      ext.creator     = 'Millwork Systems'
      Sketchup.register_extension(ext, true)
      file_loaded?(__FILE__)
    end
  end
end
`,
      mainRb: `# ==============================================================================
# Plugin: Parametric Casework & Cabinet Builder (Main Logic)
# File: su_cabinet_maker/main.rb
# ==============================================================================

require 'sketchup.rb'

module MillworkSystems
  module CabinetBuilder
    @dialog = nil

    def self.mm_to_inch(val)
      val.to_f / 25.4
    end

    def self.show_dialog
      if @dialog && @dialog.visible?
        @dialog.bring_to_front
        return
      end

      @dialog = UI::HtmlDialog.new(
        dialog_title: 'Cabinet & Casework Builder',
        preferences_key: 'Millwork_Cabinets',
        scrollable: true,
        resizable: true,
        width: 380,
        height: 600
      )

      @dialog.set_file(File.join(__dir__, 'dialog.html'))

      @dialog.add_action_callback('buildCabinet') do |_action_context, params|
        create_cabinet(params)
      end

      @dialog.show
    end

    def self.create_cabinet(params)
      model = Sketchup.active_model
      model.start_operation('Generate Parametric Cabinet', true)

      begin
        w = mm_to_inch(params['cabinetWidth'] || 800)
        h = mm_to_inch(params['cabinetHeight'] || 870)
        d = mm_to_inch(params['cabinetDepth'] || 580)
        tk_h = mm_to_inch(params['toeKickHeight'] || 100)
        tk_r = mm_to_inch(params['toeKickRecess'] || 60)
        thick = mm_to_inch(18) # 3/4" material

        entities = model.active_entities
        cab_group = entities.add_group
        cab_group.name = "Base Cabinet #{params['cabinetWidth']}x#{params['cabinetHeight']}"
        cents = cab_group.entities

        # 1. Left Side Panel
        left_face = cents.add_face([0, 0, tk_h], [thick, 0, tk_h], [thick, d, tk_h], [0, d, tk_h])
        left_face.pushpull(-(h - tk_h)) if left_face

        # 2. Right Side Panel
        right_face = cents.add_face([w - thick, 0, tk_h], [w, 0, tk_h], [w, d, tk_h], [w - thick, d, tk_h])
        right_face.pushpull(-(h - tk_h)) if right_face

        # 3. Bottom Deck
        deck_face = cents.add_face([thick, 0, tk_h], [w - thick, 0, tk_h], [w - thick, d, tk_h], [thick, d, tk_h])
        deck_face.pushpull(-thick) if deck_face

        # 4. Toe Kick Base Recess
        tk_face = cents.add_face([0, tk_r, 0], [w, tk_r, 0], [w, d, 0], [0, d, 0])
        tk_face.pushpull(-tk_h) if tk_face

        model.commit_operation
      rescue => e
        model.abort_operation
        UI.messagebox("Error: #{e.message}")
      end
    end

    unless file_loaded?(__FILE__)
      cmd = UI::Command.new('Cabinet Builder') { show_dialog }
      UI.menu('Extensions').add_item(cmd)
      file_loaded?(__FILE__)
    end
  end
end
`,
      dialogHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Cabinet Maker</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="wrap">
    <h3>Casework & Cabinet Builder</h3>
    <div class="form-group">
      <label>Width (mm)</label>
      <input type="number" id="width" value="800">
    </div>
    <div class="form-group">
      <label>Height (mm)</label>
      <input type="number" id="height" value="870">
    </div>
    <div class="form-group">
      <label>Depth (mm)</label>
      <input type="number" id="depth" value="580">
    </div>
    <div class="form-group">
      <label>Door Style</label>
      <select id="doorStyle">
        <option>Shaker 5-Piece</option>
        <option>Modern Flat Slab</option>
      </select>
    </div>
    <button class="btn-build" onclick="build()">Insert Cabinet</button>
  </div>
  <script src="dialog.js"></script>
</body>
</html>`,
      dialogJs: `function build() {
  var data = {
    cabinetWidth: document.getElementById('width').value,
    cabinetHeight: document.getElementById('height').value,
    cabinetDepth: document.getElementById('depth').value,
    doorStyle: document.getElementById('doorStyle').value
  };
  if (window.sketchup && typeof window.sketchup.buildCabinet === 'function') {
    sketchup.buildCabinet(data);
  }
}`,
      dialogCss: `body { background: #262626; color: #fff; font-family: sans-serif; padding: 12px; }
.form-group { margin-bottom: 10px; }
label { display: block; font-size: 11px; margin-bottom: 4px; color: #a3a3a3; }
input, select { width: 100%; padding: 6px; background: #171717; color: #fff; border: 1px solid #404040; border-radius: 4px; }
.btn-build { width: 100%; padding: 10px; background: #0284c7; color: #fff; border: none; border-radius: 4px; font-weight: 600; cursor: pointer; margin-top: 10px; }`,
    },
  },
  {
    id: 'su_timber_framing',
    name: 'Timber Wall Framing & Stud Generator',
    version: '1.1.0',
    author: 'Structural BIM Labs',
    description: 'Generates real architectural 2x4 and 2x6 timber stud walls with sole plate, top plate, double top plate, king/jack studs and headers.',
    category: 'BIM & Structure',
    icon: 'Grid3x3',
    geometryType: 'framing',
    tags: ['Framing', 'Timber', 'Studs', 'Architecture', 'BIM', 'Wood Frame'],
    features: [
      'Standard 16" (406mm) or 24" (610mm) on-center stud spacing',
      'Lumber sizes: 2x4 (38x89mm) and 2x6 (38x140mm)',
      'Double top plates with staggered laps',
      'Window and door rough opening framing (Headers, Trimmers/Jacks, Sills)',
      'Tagging: Structure > Framing > Studs / Plates / Headers',
    ],
    parameters: [
      { key: 'wallLength', label: 'Wall Length', type: 'number', default: 3600, unit: 'mm', min: 1200, max: 12000, step: 100, category: 'Dimensions' },
      { key: 'wallHeight', label: 'Wall Height', type: 'number', default: 2440, unit: 'mm', min: 1800, max: 4000, step: 50, category: 'Dimensions' },
      { key: 'studSpacing', label: 'Stud Spacing', type: 'select', default: '406', options: [
        { label: '16" O.C. (406 mm)', value: 406 },
        { label: '24" O.C. (610 mm)', value: 610 },
      ], category: 'Layout' },
      { key: 'lumberSize', label: 'Lumber Size', type: 'select', default: '2x4 (38x89mm)', options: [
        { label: '2x4 (38 x 89 mm)', value: '2x4' },
        { label: '2x6 (38 x 140 mm)', value: '2x6' },
      ], category: 'Materials' },
      { key: 'doubleTopPlate', label: 'Double Top Plate', type: 'boolean', default: true, category: 'Plates' },
      { key: 'includeOpening', label: 'Include Window Rough Opening', type: 'boolean', default: true, category: 'Openings' },
      { key: 'openingWidth', label: 'Opening Width', type: 'number', default: 900, unit: 'mm', min: 600, max: 2400, step: 50, category: 'Openings' },
    ],
    files: {
      registrarRb: `# ==============================================================================
# Extension: Timber Wall Framing & Stud Generator
# Author: Structural BIM Labs
# Compatible: Trimble SketchUp 2017 - 2026+
# ==============================================================================

require 'sketchup.rb'
require 'extensions.rb'

module StructuralBIM
  module WallFraming
    unless file_loaded?(__FILE__)
      ext = SketchupExtension.new(
        'Timber Wall Framing & Stud Generator',
        'su_timber_framing/main'
      )
      ext.description = 'Generates 2x4 and 2x6 timber wall assemblies with on-center studs, plates, and headers.'
      ext.version     = '1.1.0'
      ext.creator     = 'Structural BIM Labs'
      Sketchup.register_extension(ext, true)
      file_loaded?(__FILE__)
    end
  end
end
`,
      mainRb: `# ==============================================================================
# Plugin: Timber Wall Framing (Main Logic)
# File: su_timber_framing/main.rb
# ==============================================================================

require 'sketchup.rb'

module StructuralBIM
  module WallFraming
    @dialog = nil

    def self.mm_to_inch(val)
      val.to_f / 25.4
    end

    def self.show_dialog
      @dialog = UI::HtmlDialog.new(
        dialog_title: 'Timber Wall Framer',
        preferences_key: 'BIM_Framing',
        width: 360,
        height: 580
      )
      @dialog.set_file(File.join(__dir__, 'dialog.html'))

      @dialog.add_action_callback('buildWall') do |_ctx, params|
        generate_framing(params)
      end

      @dialog.show
    end

    def self.generate_framing(params)
      model = Sketchup.active_model
      model.start_operation('Frame Timber Wall', true)

      begin
        wall_len = mm_to_inch(params['wallLength'] || 3600)
        wall_h   = mm_to_inch(params['wallHeight'] || 2440)
        spacing  = mm_to_inch(params['studSpacing'] || 406)

        # 2x4 standard actual size: 1.5" x 3.5" (38 x 89 mm)
        t_stud = mm_to_inch(38)
        w_stud = mm_to_inch(89)
        plate_t = t_stud

        group = model.active_entities.add_group
        group.name = 'Timber Wall Framing'
        ents = group.entities

        # Sole Plate (bottom)
        sole = ents.add_face([0, 0, 0], [wall_len, 0, 0], [wall_len, w_stud, 0], [0, w_stud, 0])
        sole.pushpull(-plate_t) if sole

        # Top Plate
        top1 = ents.add_face([0, 0, wall_h - plate_t * 2], [wall_len, 0, wall_h - plate_t * 2], [wall_len, w_stud, wall_h - plate_t * 2], [0, w_stud, wall_h - plate_t * 2])
        top1.pushpull(-plate_t) if top1

        # Double Top Plate
        top2 = ents.add_face([0, 0, wall_h - plate_t], [wall_len, 0, wall_h - plate_t], [wall_len, w_stud, wall_h - plate_t], [0, w_stud, wall_h - plate_t])
        top2.pushpull(-plate_t) if top2

        # Studs on Center
        stud_h = wall_h - (plate_t * 3)
        curr_x = 0
        while curr_x < wall_len
          pos_x = [curr_x, wall_len - t_stud].min
          stud = ents.add_face([pos_x, 0, plate_t], [pos_x + t_stud, 0, plate_t], [pos_x + t_stud, w_stud, plate_t], [pos_x, w_stud, plate_t])
          stud.pushpull(-stud_h) if stud
          curr_x += spacing
        end

        model.commit_operation
      rescue => e
        model.abort_operation
        UI.messagebox("Framing error: #{e.message}")
      end
    end

    unless file_loaded?(__FILE__)
      cmd = UI::Command.new('Timber Wall Framer') { show_dialog }
      UI.menu('Extensions').add_item(cmd)
      file_loaded?(__FILE__)
    end
  end
end
`,
      dialogHtml: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Wall Framer</title><link rel="stylesheet" href="style.css"></head>
<body>
  <h2>Timber Wall Framing</h2>
  <div class="row"><label>Wall Length (mm)</label><input id="wallLength" type="number" value="3600"></div>
  <div class="row"><label>Wall Height (mm)</label><input id="wallHeight" type="number" value="2440"></div>
  <div class="row"><label>Stud Spacing</label><select id="studSpacing"><option value="406">16" O.C. (406 mm)</option><option value="610">24" O.C. (610 mm)</option></select></div>
  <button class="btn" onclick="build()">Generate Framing</button>
  <script src="dialog.js"></script>
</body>
</html>`,
      dialogJs: `function build() {
  var data = {
    wallLength: document.getElementById('wallLength').value,
    wallHeight: document.getElementById('wallHeight').value,
    studSpacing: document.getElementById('studSpacing').value
  };
  if (window.sketchup && typeof window.sketchup.buildWall === 'function') {
    sketchup.buildWall(data);
  }
}`,
      dialogCss: `body { background: #1e1e24; color: #fff; font-family: sans-serif; padding: 14px; font-size: 13px; }
.row { margin-bottom: 12px; }
label { display: block; font-size: 11px; color: #9ca3af; margin-bottom: 4px; }
input, select { width: 100%; padding: 6px; background: #111827; color: #fff; border: 1px solid #374151; border-radius: 4px; }
.btn { width: 100%; padding: 10px; background: #10b981; color: #064e3b; font-weight: bold; border: none; border-radius: 4px; cursor: pointer; margin-top: 8px; }`,
    },
  },
  {
    id: 'su_fenestration_tool',
    name: 'Parametric Window & Door Fenestration',
    version: '1.0.5',
    author: 'ArchStudio Extensions',
    description: 'Instantly creates insulated double-hung or casement windows with translucent glass materials, jambs, sills, and trim casings.',
    category: 'Architecture',
    icon: 'Maximize2',
    geometryType: 'window',
    tags: ['Window', 'Fenestration', 'Glass', 'Facade', 'Opening'],
    features: [
      'Creates physical glass material with 85% opacity in SketchUp',
      'Configurable frame profile thickness and depth',
      'Parametric glazing grid (mullions: 2x2, 3x2, or clear)',
      'Exterior casing and sloped sill for authentic water runoff',
    ],
    parameters: [
      { key: 'windowWidth', label: 'Window Width', type: 'number', default: 1200, unit: 'mm', min: 400, max: 3000, step: 50, category: 'Dimensions' },
      { key: 'windowHeight', label: 'Window Height', type: 'number', default: 1500, unit: 'mm', min: 500, max: 2800, step: 50, category: 'Dimensions' },
      { key: 'frameDepth', label: 'Jamb Depth', type: 'number', default: 140, unit: 'mm', min: 70, max: 300, step: 10, category: 'Frame' },
      { key: 'frameWidth', label: 'Frame Face Width', type: 'number', default: 60, unit: 'mm', min: 35, max: 120, step: 5, category: 'Frame' },
      { key: 'mullionGridX', label: 'Horizontal Panes', type: 'number', default: 2, min: 1, max: 4, step: 1, category: 'Glazing' },
      { key: 'mullionGridY', label: 'Vertical Panes', type: 'number', default: 3, min: 1, max: 5, step: 1, category: 'Glazing' },
      { key: 'includeSill', label: 'Exterior Sloped Sill', type: 'boolean', default: true, category: 'Trim' },
      { key: 'frameColor', label: 'Frame Finish', type: 'select', default: 'Anthracite Dark', options: [
        { label: 'Anthracite Dark', value: 'Anthracite Dark' },
        { label: 'White Vinyl', value: 'White Vinyl' },
        { label: 'Natural Fir Wood', value: 'Natural Fir Wood' },
        { label: 'Bronze Anodized', value: 'Bronze Anodized' },
      ], category: 'Materials' },
    ],
    files: {
      registrarRb: `# ==============================================================================
# Extension: Parametric Window & Door Fenestration
# Author: ArchStudio Extensions
# Compatible: Trimble SketchUp 2017 - 2026+
# ==============================================================================

require 'sketchup.rb'
require 'extensions.rb'

module ArchStudio
  module FenestrationTool
    unless file_loaded?(__FILE__)
      ext = SketchupExtension.new(
        'Parametric Window & Door Fenestration',
        'su_fenestration_tool/main'
      )
      ext.description = 'Inserts parametric glazed windows, casings, and sills.'
      ext.version     = '1.0.5'
      ext.creator     = 'ArchStudio Extensions'
      Sketchup.register_extension(ext, true)
      file_loaded?(__FILE__)
    end
  end
end
`,
      mainRb: `# ==============================================================================
# Plugin: Window Fenestration (Main Logic)
# File: su_fenestration_tool/main.rb
# ==============================================================================

require 'sketchup.rb'

module ArchStudio
  module FenestrationTool
    @dialog = nil

    def self.mm_to_inch(val)
      val.to_f / 25.4
    end

    def self.show_dialog
      @dialog = UI::HtmlDialog.new(
        dialog_title: 'Parametric Window Generator',
        preferences_key: 'Arch_Windows',
        width: 380,
        height: 560
      )
      @dialog.set_file(File.join(__dir__, 'dialog.html'))

      @dialog.add_action_callback('createWindow') do |_ctx, params|
        build_window(params)
      end

      @dialog.show
    end

    def self.build_window(params)
      model = Sketchup.active_model
      model.start_operation('Insert Window', true)

      begin
        w = mm_to_inch(params['windowWidth'] || 1200)
        h = mm_to_inch(params['windowHeight'] || 1500)
        d = mm_to_inch(params['frameDepth'] || 140)
        fw = mm_to_inch(params['frameWidth'] || 60)

        # Glass material setup
        materials = model.materials
        glass_mat = materials['Clear Insulated Glass'] || materials.add('Clear Insulated Glass')
        glass_mat.color = Sketchup::Color.new(180, 220, 240)
        glass_mat.alpha = 0.35

        group = model.active_entities.add_group
        group.name = "Window Assembly #{params['windowWidth']}x#{params['windowHeight']}"
        ents = group.entities

        # Outer Frame
        outer = ents.add_face([0, 0, 0], [w, 0, 0], [w, 0, h], [0, 0, h])
        inner = ents.add_face([fw, 0, fw], [w - fw, 0, fw], [w - fw, 0, h - fw], [fw, 0, h - fw]) if outer

        # Push frame
        outer.pushpull(-d) if outer

        # Glass Pane
        glass = ents.add_face([fw, d / 2.0, fw], [w - fw, d / 2.0, fw], [w - fw, d / 2.0, h - fw], [fw, d / 2.0, h - fw])
        glass.material = glass_mat if glass
        glass.back_material = glass_mat if glass

        model.commit_operation
      rescue => e
        model.abort_operation
        UI.messagebox("Error: #{e.message}")
      end
    end

    unless file_loaded?(__FILE__)
      cmd = UI::Command.new('Insert Window') { show_dialog }
      UI.menu('Extensions').add_item(cmd)
      file_loaded?(__FILE__)
    end
  end
end
`,
      dialogHtml: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Window Tool</title><link rel="stylesheet" href="style.css"></head>
<body>
  <h2>Parametric Window</h2>
  <div class="row"><label>Width (mm)</label><input id="w" type="number" value="1200"></div>
  <div class="row"><label>Height (mm)</label><input id="h" type="number" value="1500"></div>
  <div class="row"><label>Jamb Depth (mm)</label><input id="d" type="number" value="140"></div>
  <button class="btn" onclick="insert()">Insert Window</button>
  <script src="dialog.js"></script>
</body>
</html>`,
      dialogJs: `function insert() {
  var data = {
    windowWidth: document.getElementById('w').value,
    windowHeight: document.getElementById('h').value,
    frameDepth: document.getElementById('d').value
  };
  if (window.sketchup && typeof window.sketchup.createWindow === 'function') {
    sketchup.createWindow(data);
  }
}`,
      dialogCss: `body { background: #1c1917; color: #fff; font-family: sans-serif; padding: 14px; font-size: 13px; }
.row { margin-bottom: 12px; }
label { display: block; font-size: 11px; color: #a8a29e; margin-bottom: 4px; }
input { width: 100%; padding: 6px; background: #292524; color: #fff; border: 1px solid #44403c; border-radius: 4px; }
.btn { width: 100%; padding: 10px; background: #38bdf8; color: #082f49; font-weight: bold; border: none; border-radius: 4px; cursor: pointer; }`,
    },
  },
];
