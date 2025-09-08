const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload image to Cloudinary
const uploadImage = async (buffer, originalName) => {
    try {
        return new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    resource_type: 'auto',
                    folder: 'catalog-app',
                    public_id: `item_${Date.now()}_${originalName.split('.')[0]}`,
                    quality: 'auto:good',
                    format: 'webp'
                },
                (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            ).end(buffer);
        });
    } catch (error) {
        throw new Error(`Cloudinary upload failed: ${error.message}`);
    }
};

// Delete image from Cloudinary
const deleteImage = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        throw new Error(`Cloudinary delete failed: ${error.message}`);
    }
};

// Get optimized image URL
const getOptimizedImageUrl = (publicId, options = {}) => {
    const defaultOptions = {
        quality: 'auto:good',
        format: 'webp',
        crop: 'limit',
        width: 800,
        height: 600
    };
    
    return cloudinary.url(publicId, { ...defaultOptions, ...options });
};

module.exports = {
    uploadImage,
    deleteImage,
    getOptimizedImageUrl,
    cloudinary
};
