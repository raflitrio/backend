const express = require('express');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const app = express();
const port = 8080;


const storage = new Storage({
  keyFilename: 'service-account-file.json',
});
const bucketName = 'skincam';


const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } 
});

app.get('/allavatars', async (req, res) => {
  try {
    const [files] = await storage.bucket(bucketName).getFiles({ prefix: 'avatar/' });


    const imageFiles = files.filter(file => 
      file.name.endsWith('.png') || file.name.endsWith('.jpg') || file.name.endsWith('.jpeg')
    ).map(file => {
  
      const imagePath = file.name;
      return `http://storage.googleapis.com/${bucketName}/${imagePath}`;
    });


    if (imageFiles.length === 0) {
      return res.status(404).send('No images found');
    }


    res.status(200).json({ images: imageFiles });
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).send('Error fetching images');
  }
});


app.get('/avatar/:imageName', async (req, res) => {
  const imageName = req.params.imageName;
  const imagePath = `avatar/${imageName}`; 

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
  const file = req.files?.[0];
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

    await gcsFile.save(file.buffer, {
      contentType: file.mimetype,
      public: true,
    });


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





app.get('/produkimg/malam/:subfolder', async (req, res) => {
  const { subfolder } = req.params;
  const imagePathPrefix = `produkimg/malam/${subfolder}`;

  try {

    const [files] = await storage.bucket(bucketName).getFiles({ prefix: imagePathPrefix });

    if (files.length === 0) {
      return res.status(404).send('No files found in the folder');
    }

    const fileUrls = [];

    for (const file of files) {
      const fileName = file.name;
      const fileExtension = fileName.split('.').pop().toLowerCase();

  
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


    if (fileUrls.length === 0) {
      return res.status(404).send('No supported files found in the folder');
    }


    res.status(200).json({ files: fileUrls });

  } catch (error) {
    console.error('Error accessing the folder:', error);
    res.status(500).send('Error accessing the folder');
  }
});


app.get('/produkimg/pagi/:subfolder', async (req, res) => {
  const { subfolder } = req.params;
  const imagePathPrefix = `produkimg/pagi/${subfolder}`;

  try {
 
    const [files] = await storage.bucket(bucketName).getFiles({ prefix: imagePathPrefix });

    if (files.length === 0) {
      return res.status(404).send('No files found in the folder');
    }

    const fileUrls = [];

    for (const file of files) {
      const fileName = file.name;
      const fileExtension = fileName.split('.').pop().toLowerCase();


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


    if (fileUrls.length === 0) {
      return res.status(404).send('No supported files found in the folder');
    }


    res.status(200).json({ files: fileUrls });

  } catch (error) {
    console.error('Error accessing the folder:', error);
    res.status(500).send('Error accessing the folder');
  }
});


app.get('/produkimg/pagi/:subfolder/:imageName', async (req, res) => {
  const { subfolder, imageName } = req.params; 
  const imagePathPrefix = `produkimg/pagi/${subfolder}/${imageName}`; 

  try {

    const [files] = await storage.bucket(bucketName).getFiles({ prefix: imagePathPrefix });

    if (files.length === 0) {
      return res.status(404).send('No files found in the folder');
    }

    const fileUrls = [];

    for (const file of files) {
      const fileName = file.name;
      const fileExtension = fileName.split('.').pop().toLowerCase();


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


    if (fileUrls.length === 0) {
      return res.status(404).send('No supported files found in the folder');
    }


    res.status(200).json({ files: fileUrls });

  } catch (error) {
    console.error('Error accessing the folder:', error);
    res.status(500).send('Error accessing the folder');
  }
});



app.get('/produkimg/malam/:subfolder/:imageName', async (req, res) => {
  const { subfolder, imageName } = req.params; 
  const imagePathPrefix = `produkimg/malam/${subfolder}/${imageName}`;

  try {

    const [files] = await storage.bucket(bucketName).getFiles({ prefix: imagePathPrefix });

    if (files.length === 0) {
      return res.status(404).send('No files found in the folder');
    }

    const fileUrls = [];

    for (const file of files) {
      const fileName = file.name;
      const fileExtension = fileName.split('.').pop().toLowerCase();

    
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


    if (fileUrls.length === 0) {
      return res.status(404).send('No supported files found in the folder');
    }


    res.status(200).json({ files: fileUrls });

  } catch (error) {
    console.error('Error accessing the folder:', error);
    res.status(500).send('Error accessing the folder');
  }
});




app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
