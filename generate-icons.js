// Script para gerar ícones PNG simples
// Execute no navegador para baixar os ícones

function generateIcon(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#2196F3');
    gradient.addColorStop(1, '#1976D2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // Icon - Simple warehouse/box design
    ctx.fillStyle = 'white';
    
    // Building base
    const baseWidth = size * 0.6;
    const baseHeight = size * 0.3;
    const baseX = (size - baseWidth) / 2;
    const baseY = size * 0.5;
    
    ctx.fillRect(baseX, baseY, baseWidth, baseHeight);
    
    // Roof triangle
    ctx.beginPath();
    ctx.moveTo(size * 0.5, size * 0.25); // top point
    ctx.lineTo(baseX, baseY); // bottom left
    ctx.lineTo(baseX + baseWidth, baseY); // bottom right
    ctx.closePath();
    ctx.fill();
    
    // Door
    const doorWidth = size * 0.15;
    const doorHeight = size * 0.2;
    const doorX = size * 0.5 - doorWidth / 2;
    const doorY = baseY + (baseHeight - doorHeight);
    
    ctx.fillStyle = '#1976D2';
    ctx.fillRect(doorX, doorY, doorWidth, doorHeight);
    
    // Windows
    const windowSize = size * 0.08;
    ctx.fillRect(baseX + size * 0.05, baseY + size * 0.05, windowSize, windowSize);
    ctx.fillRect(baseX + baseWidth - size * 0.05 - windowSize, baseY + size * 0.05, windowSize, windowSize);
    
    return canvas;
}

// Generate icons in common PWA sizes
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const container = document.body || document.createElement('div');

sizes.forEach(size => {
    const canvas = generateIcon(size);
    const link = document.createElement('a');
    link.download = `icon-${size}x${size}.png`;
    link.href = canvas.toDataURL('image/png');
    link.textContent = `Download ${size}x${size}`;
    link.style.display = 'block';
    link.style.margin = '10px';
    
    container.appendChild(link);
    container.appendChild(canvas);
});

console.log('Ícones gerados! Clique nos links para baixar.');

// Auto-download all icons if running in browser
if (typeof window !== 'undefined') {
    sizes.forEach(size => {
        const canvas = generateIcon(size);
        const link = document.createElement('a');
        link.download = `icon-${size}x${size}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        // link.click(); // Uncomment to auto-download
        document.body.removeChild(link);
    });
}
