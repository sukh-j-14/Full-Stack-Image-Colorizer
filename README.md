# Chromora — AI Image Colorizer

Turn black-and-white photographs into naturally colorized images with deep learning, directly in your browser.

**Live application:** [full-stack-image-colorizer.vercel.app](https://full-stack-image-colorizer.vercel.app)

## Highlights

- Drag-and-drop image upload with an instant preview
- AI colorization powered by the Zhang et al. model exported to ONNX
- Side-by-side original and colorized results
- One-click JPEG download
- Responsive React interface with session history
- A single Vercel deployment for both the frontend and API

## How it works

The React client sends the selected image to a FastAPI function. The function converts the image to CIE Lab color space, runs the luminance channel through the ONNX colorization network, combines the predicted color channels with the original luminance, and returns a JPEG.

The original Caffe weights are about 129 MB. Bundling those weights with OpenCV made the serverless function too large for Vercel. The production implementation solves this by:

1. Using the equivalent ONNX model with the lighter ONNX Runtime dependency.
2. Keeping the model outside the deployment bundle.
3. Downloading it to Vercel's temporary storage on the first request of a function instance.
4. Reusing that cached file for subsequent requests on the warm instance.

The first request after a cold start can therefore take longer than later requests.

## Technology

| Layer | Technology |
| --- | --- |
| Frontend | React, Material UI, Axios |
| API | FastAPI, Python, Pillow, NumPy |
| Inference | ONNX Runtime |
| Hosting | Vercel |

## Project structure

```text
.
├── api/
│   └── index.py           # Production FastAPI and ONNX inference
├── backend/               # Original/local Python implementation
├── frontend/
│   ├── public/
│   └── src/               # React application
├── requirements.txt       # Production Python dependencies
└── vercel.json            # Build and routing configuration
```

## Run locally

### Requirements

- Python 3.12
- Node.js 18 or newer

### Start the API

From the project root:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn api.index:app --reload --port 8000
```

The model is downloaded automatically on the first colorization request. To use another model host, set `MODEL_URL` to a direct HTTPS URL for the compatible ONNX file.

### Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm start
```

Open `http://localhost:3000`. Development requests use `http://localhost:8000`; production uses the same-origin `/api` route.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check API status |
| `POST` | `/api/upload` | Upload and colorize an image |

Uploads are limited to 10 MB. Large images are resized to a maximum processing edge of 1600 pixels to keep inference reliable in a serverless environment.

## Deploy to Vercel

Import the repository in Vercel or deploy it from the repository root:

```bash
npx vercel --prod
```

No database is required. Results are returned directly to the browser and recent items exist only in the current browser session.

## Model attribution

The colorization network is based on [Colorful Image Colorization](https://richzhang.github.io/colorization/) by Richard Zhang, Phillip Isola, and Alexei A. Efros. Model output is an AI-generated estimate: historically accurate colors are not guaranteed.
