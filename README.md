# Image Colorization Project

A web application that colorizes black & white images using deep learning. The project features a React frontend, a FastAPI backend, and leverages OpenCV's deep learning module with a pre-trained Caffe model for colorization.

---

## Features

- Upload black & white images and receive colorized versions.
- View and download your upload and colorization history.
- Modern, responsive React frontend (Material UI).
- FastAPI backend with MongoDB for upload history.
- Uses OpenCV and a pre-trained Caffe model for colorization.

---

## Project Structure

```
.
├── backend/         # FastAPI backend (Python)
│   ├── main.py
│   ├── uploads/
│   ├── colorized/
│   └── ...
├── frontend/        # React frontend (JavaScript)
│   ├── src/
│   ├── public/
│   └── package.json
├── colorization_deploy_v2.prototxt
├── colorization_release_v2.caffemodel
├── pts_in_hull.npy
├── colorize.py      # Standalone colorization script (for testing)
└── ...
```

---

## Setup Instructions

### Prerequisites

- Python 3.8+
- Node.js (v16+ recommended)
- MongoDB (running locally on default port)
- pip, npm

### 1. Backend Setup

1. **Create a virtual environment and activate it:**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install fastapi uvicorn pymongo opencv-python numpy
   ```

3. **Start the FastAPI server:**
   ```bash
   uvicorn main:app --reload
   ```

   The backend will run at `http://127.0.0.1:8000`.

### 2. Frontend Setup

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Start the React development server:**
   ```bash
   npm start
   ```

   The frontend will run at `http://localhost:3000` and communicate with the backend.

### 3. Model Files

Ensure the following files are present in the project root (already included):

- `colorization_deploy_v2.prototxt`
- `colorization_release_v2.caffemodel`
- `pts_in_hull.npy`

---

## Usage

1. Open the frontend in your browser (`http://localhost:3000`).
2. Upload a black & white image.
3. Wait for the colorized result and download it if desired.
4. View your upload and colorization history.

---

## Standalone Script

You can also use `colorize.py` to colorize a single image from the command line. Edit the `input_image_path` variable in the script and run:

```bash
python colorize.py
```

---

## API Endpoints

- `POST /upload` — Upload an image for colorization.
- `GET /history` — Retrieve upload and colorization history.
- `GET /download/{filename}?type=colorized|upload` — Download colorized or original images.

---

## Acknowledgements

- [OpenCV DNN Colorization Model](https://github.com/richzhang/colorization)
- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://react.dev/)
- [Material UI](https://mui.com/)

---

## License

MIT License 