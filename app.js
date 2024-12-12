const express = require('express');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const app = express();
const port = 8080;

// GCS Client
const storage = new Storage({
  keyFilename: 'service-account-file.json', // Ganti dengan path file service account key
});
const bucketName = 'skincam';  // Ganti dengan nama bucket GCS

// Set up multer untuk menangani upload file
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }  // Menyimpan file sementara di memori sebelum diupload ke GCS
});

app.get('/allavatars', async (req, res) => {
  try {
    const [files] = await storage.bucket(bucketName).getFiles({ prefix: 'avatar/' });

    // Filter only files with extensions .png, .jpg, or .jpeg
    const imageFiles = files.filter(file => 
      file.name.endsWith('.png') || file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')
    ).map(file => {
      // Get the publicly accessible URL
      const imagePath = file.name;
      return `http://storage.googleapis.com/${bucketName}/${imagePath}`;
    });

    // If no images found, send a 404 response
    if (imageFiles.length === 0) {
      return res.status(404).send('No images found');
    }

    // Display the list of images
    res.status(200).json({ images: imageFiles });
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).send('Error fetching images');
  }
});

// API untuk mengambil gambar dari folder avatar di GCS (GET)
app.get('/avatar/:imageName', async (req, res) => {
  const imageName = req.params.imageName;
  const imagePath = `avatar/${imageName}`; // Menambahkan 'avatar/' ke path gambar

  try {
    const file = storage.bucket(bucketName).file(imagePath);

    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).send('Image not found');
    }

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-09-2491',
    });

    res.redirect(url);
  } catch (error) {
    console.error('Error accessing the image:', error);
    res.status(500).send('Error accessing the image');
  }
});

app.post('/upload', upload.any(), async (req, res) => {
  const file = req.files?.[0]; // Ambil file pertama dari array files
  if (!file) {
    return res.status(400).send('No file uploaded');
  }

  const fileName = `${Date.now()}-${file.originalname}`;
  const filePath = `avatar/${fileName}`;

  try {
    const bucket = storage.bucket(bucketName);
    const gcsFile = bucket.file(filePath);

    await gcsFile.save(file.buffer, {
      contentType: file.mimetype,
      public: true,
    });

    const [url] = await gcsFile.getSignedUrl({
      action: 'read',
      expires: '03-09-2491',
    });

    res.status(200).json({
      message: 'File uploaded successfully',
      fileName: file.originalname,
      fileType: file.mimetype,
      url,
    });
  } catch (error) {
    console.error('Error uploading the file:', error);
    res.status(500).send('Error uploading the file');
  }
});

// API untuk mengganti gambar yang sudah ada di folder avatar (PUT)
app.put('/avatar/:imageName', upload.single('file'), async (req, res) => {
  const imageName = req.params.imageName;
  const file = req.file;
  if (!file) {
    return res.status(400).send('No file uploaded');
  }

  const imagePath = `avatar/${imageName}`;

  try {
    const bucket = storage.bucket(bucketName);
    const gcsFile = bucket.file(imagePath);

    // Mengupload file baru ke GCS (mengganti file lama)
    await gcsFile.save(file.buffer, {
      contentType: file.mimetype,
      public: true,  // Agar file bisa diakses publik
    });

    // Mendapatkan URL gambar yang bisa diakses
    const [url] = await gcsFile.getSignedUrl({
      action: 'read',
      expires: '03-09-2491',
    });

    res.status(200).json({ message: 'File updated successfully', url });
  } catch (error) {
    console.error('Error updating the image:', error);
    res.status(500).send('Error updating the image');
  }
});

///////BY SUB FOLDER///////////
app.get('/produkimg/malam/:subfolder', async (req, res) => {
  const { subfolder } = req.params; // Ambil parameter 'subfolder'
  const imagePathPrefix = `produkimg/malam/${subfolder}/`; // Tambahkan '/' di akhir path untuk memastikan ini adalah prefix folder

  try {
    // Mendapatkan semua file dengan prefix yang sesuai
    const [files] = await storage.bucket(bucketName).getFiles({ prefix: imagePathPrefix });

    // Jika tidak ada file ditemukan
    if (files.length === 0) {
      return res.status(404).send('No files found in the folder');
    }

    const fileUrls = [];

    for (const file of files) {
      const fileNameWithExt = file.name.replace(imagePathPrefix, ''); // Ambil nama file lengkap
      const fileName = fileNameWithExt.split('.').slice(0, -1).join('.'); // Hapus ekstensi file, hanya ambil nama
      const fileExtension = fileNameWithExt.split('.').pop().toLowerCase(); // Ekstensi file (untuk tipe)

      // Hanya proses file dengan tipe yang diinginkan
      if (['png', 'jpg', 'jpeg', 'txt'].includes(fileExtension)) {
        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: '03-09-2491', // Tanggal kedaluwarsa URL
        });

        fileUrls.push({ 
          type: fileExtension === 'txt' ? 'text' : 'image', 
          name: fileName,  // Hanya gunakan nama file tanpa ekstensi
          url 
        });
      }
    }

    // Jika tidak ada file yang sesuai tipe
    if (fileUrls.length === 0) {
      return res.status(404).send('No supported files found in the folder');
    }

    // Kembalikan hasil sebagai JSON
    res.status(200).json({ files: fileUrls });

  } catch (error) {
    console.error('Error accessing the folder:', error);
    res.status(500).send('Error accessing the folder');
  }
});

///////ALL MALAM///////
app.get('/allmalam', async (req, res) => {
  try {
    // Mendapatkan semua file dengan prefix 'allmalam/'
    const [files] = await storage.bucket(bucketName).getFiles({ prefix: 'allmalam/' });

    // Jika tidak ada file ditemukan
    if (files.length === 0) {
      return res.status(404).send('No files found in the folder');
    }

    const fileUrls = [];

    // Proses setiap file untuk menghasilkan URL yang dapat diakses
    for (const file of files) {
      const fileNameWithExt = file.name.split('/').pop(); // Ambil nama file dari path lengkap
      const fileName = fileNameWithExt.split('.').slice(0, -1).join('.'); // Hapus ekstensi dari nama file
      const fileExtension = fileNameWithExt.split('.').pop().toLowerCase(); // Mendapatkan ekstensi file untuk tipe

      // Hanya proses file dengan tipe yang diinginkan (image atau text)
      if (['png', 'jpg', 'jpeg', 'txt'].includes(fileExtension)) {
        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: '03-09-2491', // Tanggal kedaluwarsa URL
        });

        fileUrls.push({ 
          type: fileExtension === 'txt' ? 'text' : 'image',  // Tentukan tipe file
          name: fileName,  // Hanya gunakan nama file tanpa ekstensi
          url 
        });
      }
    }

    // Jika tidak ada file yang sesuai tipe
    if (fileUrls.length === 0) {
      return res.status(404).send('No supported files found in the folder');
    }

    // Kembalikan hasil sebagai JSON
    res.status(200).json({ files: fileUrls });

  } catch (error) {
    console.error('Error accessing the folder:', error);
    res.status(500).send('Error accessing the folder');
  }
});

/////////ALL PAGI/////////


app.get('/allpagi', async (req, res) => {
  try {
    // Mendapatkan semua file dengan prefix 'allmalam/'
    const [files] = await storage.bucket(bucketName).getFiles({ prefix: 'allpagi/' });

    // Jika tidak ada file ditemukan
    if (files.length === 0) {
      return res.status(404).send('No files found in the folder');
    }

    const fileUrls = [];

    // Proses setiap file untuk menghasilkan URL yang dapat diakses
    for (const file of files) {
      const fileNameWithExt = file.name.split('/').pop(); // Ambil nama file dari path lengkap
      const fileName = fileNameWithExt.split('.').slice(0, -1).join('.'); // Hapus ekstensi dari nama file
      const fileExtension = fileNameWithExt.split('.').pop().toLowerCase(); // Mendapatkan ekstensi file untuk tipe

      // Hanya proses file dengan tipe yang diinginkan (image atau text)
      if (['png', 'jpg', 'jpeg', 'txt'].includes(fileExtension)) {
        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: '03-09-2491', // Tanggal kedaluwarsa URL
        });

        fileUrls.push({ 
          type: fileExtension === 'txt' ? 'text' : 'image',  // Tentukan tipe file
          name: fileName,  // Hanya gunakan nama file tanpa ekstensi
          url 
        });
      }
    }

    // Jika tidak ada file yang sesuai tipe
    if (fileUrls.length === 0) {
      return res.status(404).send('No supported files found in the folder');
    }

    // Kembalikan hasil sebagai JSON
    res.status(200).json({ files: fileUrls });

  } catch (error) {
    console.error('Error accessing the folder:', error);
    res.status(500).send('Error accessing the folder');
  }
});

app.get('/produkimg/pagi/:subfolder', async (req, res) => {
  const { subfolder } = req.params; // Ambil parameter 'subfolder'
  const imagePathPrefix = `produkimg/pagi/${subfolder}/`; // Tambahkan '/' di akhir path untuk memastikan ini adalah prefix folder

  try {
    // Mendapatkan semua file dengan prefix yang sesuai
    const [files] = await storage.bucket(bucketName).getFiles({ prefix: imagePathPrefix });

    // Jika tidak ada file ditemukan
    if (files.length === 0) {
      return res.status(404).send('No files found in the folder');
    }

    const fileUrls = [];

    for (const file of files) {
      const fileNameWithExt = file.name.replace(imagePathPrefix, ''); // Ambil nama file lengkap
      const fileName = fileNameWithExt.split('.').slice(0, -1).join('.'); // Hapus ekstensi file, hanya ambil nama
      const fileExtension = fileNameWithExt.split('.').pop().toLowerCase(); // Ekstensi file (untuk tipe)

      // Hanya proses file dengan tipe yang diinginkan
      if (['png', 'jpg', 'jpeg', 'txt'].includes(fileExtension)) {
        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: '03-09-2491', // Tanggal kedaluwarsa URL
        });

        fileUrls.push({ 
          type: fileExtension === 'txt' ? 'text' : 'image', 
          name: fileName,  // Hanya gunakan nama file tanpa ekstensi
          url 
        });
      }
    }

    // Jika tidak ada file yang sesuai tipe
    if (fileUrls.length === 0) {
      return res.status(404).send('No supported files found in the folder');
    }

    // Kembalikan hasil sebagai JSON
    res.status(200).json({ files: fileUrls });

  } catch (error) {
    console.error('Error accessing the folder:', error);
    res.status(500).send('Error accessing the folder');
  }
});

app.get('/produkimg/pagi/:subfolder/:imageName', async (req, res) => {
  const { subfolder, imageName } = req.params; // Destructure both 'subfolder' and 'imageName' from req.params
  const imagePathPrefix = `produkimg/pagi/${subfolder}/${imageName}`; // Correct path with subfolder and image name

  try {
    // List all files in the subfolder
    const [files] = await storage.bucket(bucketName).getFiles({ prefix: imagePathPrefix });

    if (files.length === 0) {
      return res.status(404).send('No files found in the folder');
    }

    const fileUrls = [];

    for (const file of files) {
      const fileName = file.name;
      const fileExtension = fileName.split('.').pop().toLowerCase();

      // Determine the file type and generate signed URL
      if (['png', 'jpg', 'jpeg'].includes(fileExtension)) {
        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: '03-09-2491',
        });
        fileUrls.push({ type: 'image', name: fileName, url });
      } else if (fileExtension === 'txt') {
        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: '03-09-2491',
        });
        fileUrls.push({ type: 'text', name: fileName, url });
      }
    }

    // If no recognized files found
    if (fileUrls.length === 0) {
      return res.status(404).send('No supported files found in the folder');
    }

    // Return the list of URLs
    res.status(200).json({ files: fileUrls });

  } catch (error) {
    console.error('Error accessing the folder:', error);
    res.status(500).send('Error accessing the folder');
  }
});

app.get('/produkimg/malam/:subfolder/:imageName', async (req, res) => {
  const { subfolder, imageName } = req.params; // Destructure both 'subfolder' and 'imageName' from req.params
  const imagePathPrefix = `produkimg/malam/${subfolder}/${imageName}`; // Correct path with subfolder and image name

  try {
    // List all files in the subfolder
    const [files] = await storage.bucket(bucketName).getFiles({ prefix: imagePathPrefix });

    if (files.length === 0) {
      return res.status(404).send('No files found in the folder');
    }

    const fileUrls = [];

    for (const file of files) {
      const fileName = file.name;
      const fileExtension = fileName.split('.').pop().toLowerCase();

      // Determine the file type and generate signed URL
      if (['png', 'jpg', 'jpeg'].includes(fileExtension)) {
        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: '03-09-2491',
        });
        fileUrls.push({ type: 'image', name: fileName, url });
      } else if (fileExtension === 'txt') {
        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: '03-09-2491',
        });
        fileUrls.push({ type: 'text', name: fileName, url });
      }
    }

    // If no recognized files found
    if (fileUrls.length === 0) {
      return res.status(404).send('No supported files found in the folder');
    }

    // Return the list of URLs
    res.status(200).json({ files: fileUrls });

  } catch (error) {
    console.error('Error accessing the folder:', error);
    res.status(500).send('Error accessing the folder');
  }
});

// Server berjalan
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running at http://0.0.0.0:${port}`);
});
