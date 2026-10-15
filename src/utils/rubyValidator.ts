export interface ValidationRuleResult {
  id: string;
  title: string;
  status: 'pass' | 'warning' | 'error' | 'info';
  message: string;
  recommendation?: string;
}

export interface ExtensionValidationReport {
  overallScore: number;
  passedCount: number;
  warningCount: number;
  errorCount: number;
  rules: ValidationRuleResult[];
}

export function validateSketchUpRubyCode(
  registrarCode: string,
  mainRubyCode: string
): ExtensionValidationReport {
  const rules: ValidationRuleResult[] = [];

  // Rule 1: Root Registrar Extension Definition
  const hasSketchupExtension = /SketchupExtension\.new/i.test(registrarCode);
  const hasRegisterExtension = /Sketchup\.register_extension/i.test(registrarCode);

  if (hasSketchupExtension && hasRegisterExtension) {
    rules.push({
      id: 'registrar_valid',
      title: 'SketchupExtension Registration',
      status: 'pass',
      message: 'Extension registers correctly with SketchupExtension.new and Sketchup.register_extension.',
    });
  } else {
    rules.push({
      id: 'registrar_valid',
      title: 'SketchupExtension Registration',
      status: 'error',
      message: 'Missing SketchupExtension.new or Sketchup.register_extension in root registrar.',
      recommendation: 'Ensure registrar instantiates SketchupExtension and passes it to Sketchup.register_extension(ext, true).',
    });
  }

  // Rule 2: Guard against multiple loads (file_loaded?)
  const hasFileLoaded = /file_loaded\??\s*\(\s*__FILE__\s*\)/i.test(registrarCode) || /file_loaded\??\s*\(\s*__FILE__\s*\)/i.test(mainRubyCode);
  if (hasFileLoaded) {
    rules.push({
      id: 'file_loaded_guard',
      title: 'File Loaded Guard',
      status: 'pass',
      message: 'Properly guards against duplicate menu entries on file reload using file_loaded?(__FILE__).',
    });
  } else {
    rules.push({
      id: 'file_loaded_guard',
      title: 'File Loaded Guard',
      status: 'warning',
      message: 'Recommended to wrap UI registration in unless file_loaded?(__FILE__) to prevent duplicate menus.',
    });
  }

  // Rule 3: Namespace Isolation (Module Wrapper)
  const moduleCount = (mainRubyCode.match(/\bmodule\s+[A-Z]\w*/g) || []).length;
  if (moduleCount >= 2) {
    rules.push({
      id: 'namespace_isolation',
      title: 'Two-Tier Namespace Isolation',
      status: 'pass',
      message: 'Clean double-module namespace (e.g. Module Company::Plugin) protecting SketchUp global namespace.',
    });
  } else if (moduleCount === 1) {
    rules.push({
      id: 'namespace_isolation',
      title: 'Namespace Isolation',
      status: 'warning',
      message: 'Code uses 1 module. Trimble guidelines recommend 2 levels (Author::Extension) to prevent collision.',
    });
  } else {
    rules.push({
      id: 'namespace_isolation',
      title: 'Global Namespace Collision Risk',
      status: 'error',
      message: 'No module namespace detected! Modifying global Ruby scope can break other SketchUp extensions.',
      recommendation: 'Wrap all classes, methods, and constants inside module YourName; module YourPlugin ... end; end',
    });
  }

  // Rule 4: Undo/Redo Operation Safety (start_operation)
  const hasStartOp = /start_operation/i.test(mainRubyCode);
  const hasCommitOp = /commit_operation/i.test(mainRubyCode);
  if (hasStartOp && hasCommitOp) {
    rules.push({
      id: 'undo_stack',
      title: 'Clean Undo/Redo Stack',
      status: 'pass',
      message: 'Wraps geometry changes in model.start_operation and commit_operation for 1-click Undo in SketchUp.',
    });
  } else {
    rules.push({
      id: 'undo_stack',
      title: 'Missing Undo Operation Wrapper',
      status: 'warning',
      message: 'Missing start_operation or commit_operation. Users may need hundreds of Ctrl+Z presses to undo geometry.',
      recommendation: 'Enclose modifications in: model.start_operation("Action", true) ... model.commit_operation',
    });
  }

  // Rule 5: Modern UI::HtmlDialog vs Deprecated UI::WebDialog
  const hasWebDialog = /UI::WebDialog/i.test(mainRubyCode);
  const hasHtmlDialog = /UI::HtmlDialog/i.test(mainRubyCode);
  if (hasWebDialog) {
    rules.push({
      id: 'dialog_technology',
      title: 'Deprecated WebDialog Detected',
      status: 'error',
      message: 'Uses deprecated UI::WebDialog (relies on legacy Internet Explorer on Windows).',
      recommendation: 'Migrate to UI::HtmlDialog which uses Chromium embedded in SketchUp 2017+.',
    });
  } else if (hasHtmlDialog) {
    rules.push({
      id: 'dialog_technology',
      title: 'Modern Chromium HtmlDialog',
      status: 'pass',
      message: 'Uses modern UI::HtmlDialog supporting modern HTML5, CSS Grid/Flexbox, and JavaScript.',
    });
  } else {
    rules.push({
      id: 'dialog_technology',
      title: 'Native Tool or UI',
      status: 'info',
      message: 'Extension uses native SketchUp inputs or menus without custom Web/HTML dialog.',
    });
  }

  // Rule 6: Unit handling
  const hasUnitHandling = /\.to_l|\.mm|\.inch|\.feet|\.m\b/i.test(mainRubyCode);
  if (hasUnitHandling) {
    rules.push({
      id: 'unit_discipline',
      title: 'Length Unit Conversion',
      status: 'pass',
      message: 'Handles units with SketchUp Length converters (.to_l, .mm, .inch).',
    });
  } else {
    rules.push({
      id: 'unit_discipline',
      title: 'Unit Sensitivity',
      status: 'info',
      message: 'SketchUp internally calculates everything in inches. Ensure raw numeric inputs are converted using .mm or .to_l.',
    });
  }

  const passedCount = rules.filter((r) => r.status === 'pass').length;
  const warningCount = rules.filter((r) => r.status === 'warning').length;
  const errorCount = rules.filter((r) => r.status === 'error').length;
  const overallScore = Math.max(0, Math.round((passedCount / (rules.length || 1)) * 100));

  return {
    overallScore,
    passedCount,
    warningCount,
    errorCount,
    rules,
  };
}
