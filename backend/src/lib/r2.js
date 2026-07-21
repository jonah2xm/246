const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function uploadToR2(key, buffer, contentType) {
  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  const base = process.env.R2_PUBLIC_BASE_URL;
  if (!base) {
    throw new Error("R2_PUBLIC_BASE_URL is not set — uploaded but no public URL can be returned");
  }
  return `${base.replace(/\/$/, "")}/${key}`;
}

async function deleteFromR2(key) {
  await r2.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }));
}

module.exports = { uploadToR2, deleteFromR2 };
