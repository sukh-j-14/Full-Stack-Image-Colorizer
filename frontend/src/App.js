import React, { useState } from 'react';
import axios from 'axios';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Card,
  CardContent,
  CardActions,
  Button,
  LinearProgress,
  Alert,
  Grid,
  Box,
  IconButton,
  Avatar,
  Paper,
  Chip,
  Stack,
  CircularProgress
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import ImageIcon from '@mui/icons-material/Image';
import HistoryIcon from '@mui/icons-material/History';
import DeleteIcon from '@mui/icons-material/Delete';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [colorizedUrl, setColorizedUrl] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_URL = process.env.NODE_ENV === 'development'
    ? (process.env.REACT_APP_API_URL || 'http://localhost:8000')
    : '';

  const submitForColorization = async (formData) => {
    const request = () => axios.post(`${API_URL}/api/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      responseType: 'blob',
    });
    try {
      return await request();
    } catch (firstError) {
      const status = firstError.response?.status;
      if (firstError.response && status < 500) throw firstError;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return request();
    }
  };

  // Handle file selection or drop
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    setColorizedUrl(null);
    setError(null);
    if (file) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    setSelectedFile(file);
    setColorizedUrl(null);
    setError(null);
    if (file) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Handle file upload
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await submitForColorization(formData);
      if (colorizedUrl) URL.revokeObjectURL(colorizedUrl);
      const resultUrl = URL.createObjectURL(res.data);
      setColorizedUrl(resultUrl);
      setHistory((items) => [{
        original_filename: selectedFile.name,
        upload_time: new Date().toISOString(),
        original_url: preview,
        colorized_url: resultUrl,
      }, ...items]);
    } catch (err) {
      let detail = 'Colorization failed. Please try again.';
      if (err.response?.data instanceof Blob) {
        try {
          const body = JSON.parse(await err.response.data.text());
          detail = body.detail || detail;
        } catch (_) {
          // Keep the friendly fallback for non-JSON platform errors.
        }
      }
      if (detail === 'Colorization failed. Please try again.' && err.response?.status) {
        detail = `Colorization failed (HTTP ${err.response.status}). Please try again.`;
      }
      setError(detail);
    }
    setLoading(false);
  };

  const handleDelete = (item) => {
    setHistory((items) => items.filter((entry) => entry !== item));
    URL.revokeObjectURL(item.original_url);
    URL.revokeObjectURL(item.colorized_url);
  };

  return (
    <Box className="app-shell">
      <AppBar position="sticky" elevation={0} className="topbar" sx={{ bgcolor: 'rgba(15, 40, 75, .94)' }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ minHeight: 70 }}>
            <Box className="brand-mark"><AutoAwesomeIcon /></Box>
            <Box sx={{ ml: 1.5, flexGrow: 1 }}>
              <Typography fontWeight={800} lineHeight={1.1}>Chromora</Typography>
              <Typography variant="caption" sx={{ opacity: .72 }}>AI image colorizer</Typography>
            </Box>
            <Chip label="Live" size="small" sx={{ color: '#d1fae5', bgcolor: 'rgba(16,185,129,.18)' }} />
          </Toolbar>
        </Container>
      </AppBar>
      <Container maxWidth="lg">
        <Box className="hero">
          <Chip icon={<AutoAwesomeIcon />} label="Powered by deep learning" color="primary" variant="outlined" />
          <Typography component="h1" variant="h1">Bring black & white photos back to life.</Typography>
          <Typography className="hero-copy">Upload a monochrome image and get a naturally colorized result in seconds. No account required.</Typography>
          <Stack direction="row" spacing={2.5} justifyContent="center" sx={{ mt: 2.5, color: 'text.secondary' }}>
            <Stack direction="row" spacing={.6} alignItems="center"><LockOutlinedIcon fontSize="small" /><Typography variant="caption">Private processing</Typography></Stack>
            <Stack direction="row" spacing={.6} alignItems="center"><BoltOutlinedIcon fontSize="small" /><Typography variant="caption">Fast results</Typography></Stack>
          </Stack>
        </Box>
        <Card className="surface-card" sx={{ mb: 4 }}>
          <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
            <Typography variant="h5" fontWeight={800}>Choose a photo</Typography>
            <Typography color="text.secondary" sx={{ mb: 2.5 }}>JPG, PNG or WebP up to 10 MB</Typography>
            <Paper
              elevation={0}
              className="drop-zone"
              sx={{ p: 3, mb: 2, textAlign: 'center', cursor: 'pointer' }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <Box>
              <Avatar sx={{ width: 64, height: 64, bgcolor: '#dbeafe', color: '#2563eb', mx: 'auto', mb: 1.5 }}><CloudUploadIcon sx={{ fontSize: 34 }} /></Avatar>
              <Typography variant="h6" fontWeight={750}>{selectedFile ? selectedFile.name : 'Drop your image here'}</Typography>
              <Typography color="text.secondary" sx={{ mt: .5 }}>{selectedFile ? `${(selectedFile.size / 1024).toFixed(0)} KB selected` : 'or browse files from your device'}</Typography>
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                id="file-upload"
                onChange={handleFileChange}
              />
              <label htmlFor="file-upload">
                <Button variant="outlined" component="span" sx={{ mt: 2, borderRadius: 999, px: 3 }}>
                  {selectedFile ? 'Choose another' : 'Browse files'}
                </Button>
              </label>
              {preview && (
                <Box sx={{ mt: 2.5 }}>
                  <img
                    src={preview}
                    alt="Selected preview"
                    className="preview-image"
                  />
                </Box>
              )}
              </Box>
            </Paper>
            {loading && <Box sx={{ my: 2 }}><LinearProgress sx={{ borderRadius: 99 }} /><Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 1 }}>Adding color — the first request may take a few seconds…</Typography></Box>}
            {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
            <CardActions sx={{ px: 0, pt: 1 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleUpload}
                disabled={loading || !selectedFile}
                startIcon={<CloudUploadIcon />}
                size="large"
                fullWidth
                sx={{ py: 1.5, borderRadius: 3, fontWeight: 800 }}
              >
                {loading ? <><CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />Colorizing…</> : 'Colorize photo'}
              </Button>
            </CardActions>
          </CardContent>
        </Card>
        {colorizedUrl && (
          <Card className="surface-card" sx={{ mb: 4 }}>
            <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
              <Chip label="Complete" color="success" size="small" sx={{ mb: 1.5 }} />
              <Typography variant="h4" fontWeight={850}>Your photo, reimagined</Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>Compare the original with the AI-generated color version.</Typography>
              <Box className="result-grid">
                <Box className="image-panel"><Typography variant="overline" color="text.secondary">Original</Typography><img src={preview} alt="Original" /></Box>
                <Box className="image-panel"><Typography variant="overline" color="text.secondary">Colorized</Typography><img src={colorizedUrl} alt="Colorized result" /></Box>
              </Box>
              <Button
                variant="contained"
                color="success"
                href={colorizedUrl}
                download
                startIcon={<DownloadIcon />}
                sx={{ mt: 3, borderRadius: 3, px: 3, py: 1.2, fontWeight: 800 }}
              >
                Download Colorized Image
              </Button>
            </CardContent>
          </Card>
        )}
        <Card className="surface-card" sx={{ mb: 6 }}>
          <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
            <Box display="flex" alignItems="center" mb={2}>
              <HistoryIcon sx={{ mr: 1 }} />
              <Typography variant="h5" fontWeight={800}>This session</Typography>
            </Box>
            <Grid container spacing={2}>
              {history.length === 0 && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Your recent colorizations will appear here. They stay only in this browser session.
                  </Typography>
                </Grid>
              )}
              {history.map((item, idx) => (
                <Grid item xs={12} sm={6} md={4} key={idx}>
                  <Card variant="outlined" sx={{ height: '100%', borderRadius: 3 }}>
                    <CardContent>
                      <img className="history-thumb" src={item.colorized_url} alt="Colorized history item" />
                      <Box display="flex" alignItems="center" mb={1}>
                        <Avatar sx={{ bgcolor: '#1976d2', mr: 1 }}>
                          <ImageIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" noWrap>{item.original_filename}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(item.upload_time).toLocaleString()}
                          </Typography>
                        </Box>
                        <IconButton aria-label="delete" color="error" sx={{ ml: 'auto' }} onClick={() => handleDelete(item)}>
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                      <Box display="flex" gap={1} mt={2}>
                        <Button
                          variant="outlined"
                          color="primary"
                          href={item.original_url}
                          target="_blank"
                          startIcon={<DownloadIcon />}
                          size="small"
                        >
                          Original
                        </Button>
                        <Button
                          variant="contained"
                          color="secondary"
                          href={item.colorized_url}
                          target="_blank"
                          startIcon={<DownloadIcon />}
                          size="small"
                        >
                          Colorized
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Container>
      <Box component="footer" sx={{ py: 3, borderTop: '1px solid rgba(22,32,42,.08)', textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="body2">Chromora · AI-powered colorization</Typography>
      </Box>
    </Box>
  );
}

export default App;
