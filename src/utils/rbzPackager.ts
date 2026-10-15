import JSZip from 'jszip';
import { SketchUpExtension } from '../types/extension';

/**
 * Packages a SketchUp extension into a valid .rbz archive.
 * In Trimble SketchUp, .rbz is simply a ZIP archive containing:
 *  - [extension_name].rb (Registrar loader in the root directory)
 *  - [extension_name]/   (Subfolder containing all implementation files)
 */
export async function createRbzPackage(extension: SketchUpExtension): Promise<Blob> {
  const zip = new JSZip();

  // 1. Root registrar file (e.g. su_spiral_stairs.rb)
  const rootFileName = `${extension.id}.rb`;
  zip.file(rootFileName, extension.files.registrarRb.trim() + '\n');

  // 2. Extension subfolder (e.g. su_spiral_stairs/)
  const folder = zip.folder(extension.id);
  if (folder) {
    folder.file('main.rb', extension.files.mainRb.trim() + '\n');
    folder.file('dialog.html', extension.files.dialogHtml.trim() + '\n');
    folder.file('dialog.js', extension.files.dialogJs.trim() + '\n');
    folder.file('style.css', extension.files.dialogCss.trim() + '\n');

    // Supplementary documentation & install instructions
    const readmeContent = extension.files.readmeMd || `# ${extension.name}
Version: ${extension.version}
Author: ${extension.author}

## Description
${extension.description}

## Installation in Trimble SketchUp
1. Open SketchUp (Version 2017 to 2026+).
2. Go to **Extensions** > **Extension Manager** (or **Window** > **Extension Manager**).
3. Click the **Install Extension** button at the bottom.
4. Select this \`.rbz\` file.
5. The extension will automatically load and add a toolbar / menu item under **Extensions > ${extension.name}**.

## Ruby Console
To test or reload directly in the Ruby Console:
\`\`\`ruby
load '${extension.id}/main.rb'
\`\`\`
`;
    folder.file('README.md', readmeContent.trim() + '\n');
    folder.file('INSTALL.txt', `How to install:
In Trimble SketchUp, navigate to Extensions > Extension Manager > Install Extension and select this .rbz file.`);
  }

  // Generate ZIP compressed blob
  const content = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/x-zip-compressed',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  return content;
}

/**
 * Triggers a native browser file download for a Blob
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
