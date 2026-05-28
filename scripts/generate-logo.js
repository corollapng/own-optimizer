const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Raiz do projeto (um nível acima de scripts/)
const rootDir = path.resolve(__dirname, '..');
const svgPath = path.join(rootDir, 'public', 'logo.svg');
const svgBuffer = fs.readFileSync(svgPath);

async function generateAssets() {
  console.log('Gerando assets de logo...');

  // 1. Gerar PNG 512x512 para uso geral
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(rootDir, 'public', 'logo-512.png'));
  console.log('✓ public/logo-512.png gerado');

  // 2. Gerar PNG 256x256
  await sharp(svgBuffer)
    .resize(256, 256)
    .png()
    .toFile(path.join(rootDir, 'public', 'logo-256.png'));
  console.log('✓ public/logo-256.png gerado');

  // 3. Gerar PNG 128x128
  await sharp(svgBuffer)
    .resize(128, 128)
    .png()
    .toFile(path.join(rootDir, 'public', 'logo-128.png'));
  console.log('✓ public/logo-128.png gerado');

  // 4. Gerar PNG 64x64
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(rootDir, 'public', 'logo-64.png'));
  console.log('✓ public/logo-64.png gerado');

  // 5. Gerar PNG 32x32
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(rootDir, 'public', 'logo-32.png'));
  console.log('✓ public/logo-32.png gerado');

  // 6. Gerar PNG 16x16
  await sharp(svgBuffer)
    .resize(16, 16)
    .png()
    .toFile(path.join(rootDir, 'public', 'logo-16.png'));
  console.log('✓ public/logo-16.png gerado');

  // 7. Criar ICO manualmente (formato ICO com múltiplas resoluções)
  // Um ICO é basicamente um container de múltiplas bitmaps
  // Vamos criar com os tamanhos: 16, 32, 48, 64, 128, 256
  const sizes = [16, 32, 48, 64, 128, 256];
  const pngBuffers = await Promise.all(
    sizes.map(size =>
      sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toBuffer()
    )
  );
  
  const icoBuffer = createIco(pngBuffers, sizes);
  fs.writeFileSync(path.join(rootDir, 'public', 'icon.ico'), icoBuffer);
  console.log('✓ public/icon.ico gerado com', sizes.join(', '), 'px');

  // 8. Copiar SVG para o admin-panel como favicon
  fs.copyFileSync(svgPath, path.join(rootDir, 'admin-panel', 'public', 'favicon.svg'));
  console.log('✓ admin-panel/public/favicon.svg atualizado');

  // 9. Copiar PNG 512 para uso no admin-panel
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(rootDir, 'admin-panel', 'public', 'logo.png'));
  console.log('✓ admin-panel/public/logo.png gerado');

  console.log('\n✅ Todos os assets de logo foram gerados com sucesso!');
}

function createIco(pngBuffers, sizes) {
  const numImages = pngBuffers.length;
  
  // Cabeçalho do ICO: 6 bytes
  // Diretório: 16 bytes por imagem
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = numImages * dirEntrySize;
  const dataOffset = headerSize + dirSize;
  
  // Calcula tamanho total
  let totalDataSize = 0;
  pngBuffers.forEach(buf => totalDataSize += buf.length);
  
  const totalSize = headerSize + dirSize + totalDataSize;
  const ico = Buffer.alloc(totalSize);
  
  // Escreve cabeçalho ICO
  ico.writeUInt16LE(0, 0);       // Reserved (deve ser 0)
  ico.writeUInt16LE(1, 2);       // Type: 1 = ICO
  ico.writeUInt16LE(numImages, 4); // Número de imagens
  
  let dataPos = dataOffset;
  
  // Escreve entradas do diretório
  pngBuffers.forEach((buf, i) => {
    const size = sizes[i];
    const dirOffset = headerSize + i * dirEntrySize;
    
    ico.writeUInt8(size >= 256 ? 0 : size, dirOffset);      // Width (0 = 256)
    ico.writeUInt8(size >= 256 ? 0 : size, dirOffset + 1);  // Height (0 = 256)
    ico.writeUInt8(0, dirOffset + 2);                        // Color count
    ico.writeUInt8(0, dirOffset + 3);                        // Reserved
    ico.writeUInt16LE(1, dirOffset + 4);                     // Color planes
    ico.writeUInt16LE(32, dirOffset + 6);                    // Bits per pixel
    ico.writeUInt32LE(buf.length, dirOffset + 8);            // Size of image data
    ico.writeUInt32LE(dataPos, dirOffset + 12);              // Offset de dados
    
    // Copia dados da imagem PNG
    buf.copy(ico, dataPos);
    dataPos += buf.length;
  });
  
  return ico;
}

generateAssets().catch(err => {
  console.error('Erro ao gerar assets:', err);
  process.exit(1);
});
