'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  IconButton,
  Alert,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import polyline from '@mapbox/polyline';
import 'leaflet/dist/leaflet.css';

interface Workout {
  _id: string;
  name: string;
  map?: { id: string; summary_polyline: string };
}

interface WorkoutMapModalProps {
  open: boolean;
  onClose: () => void;
  workout: Workout | null;
}

function MapController({ positions }: { positions: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(L.latLngBounds(positions), { padding: [20, 20] });
    }
  }, [map, positions]);

  return null;
}

export default function WorkoutMapModal({ open, onClose, workout }: WorkoutMapModalProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [mapMounted, setMapMounted] = useState(false);

  const summaryPolyline = workout?.map?.summary_polyline;
  const hasRoute = Boolean(summaryPolyline);

  const positions: [number, number][] = hasRoute
    ? (polyline.decode(summaryPolyline!) as [number, number][])
    : [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="md"
      fullWidth
      TransitionProps={{
        onEntered: () => setMapMounted(true),
        onExited: () => setMapMounted(false),
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 1 }}>
        <Typography variant="h6" component="span" noWrap>
          {workout?.name ?? 'Route Map'}
        </Typography>
        {fullScreen && (
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent
        sx={{
          p: 0,
          height: fullScreen ? '100%' : 450,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {!hasRoute && (
          <Box sx={{ p: 2 }}>
            <Alert severity="info">No route data available for this workout.</Alert>
          </Box>
        )}

        {hasRoute && !mapMounted && (
          <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
            <CircularProgress />
          </Box>
        )}

        {hasRoute && mapMounted && (
          <MapContainer
            center={positions[0] ?? [0, 0]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController positions={positions} />
            <Polyline
              positions={positions}
              pathOptions={{ color: theme.palette.primary.main, weight: 4 }}
            />
            {positions.length > 0 && (
              <CircleMarker
                center={positions[0]}
                radius={8}
                pathOptions={{ color: '#10B981', fillColor: '#10B981', fillOpacity: 1 }}
              >
                <Tooltip permanent={false}>Start</Tooltip>
              </CircleMarker>
            )}
            {positions.length > 1 && (
              <CircleMarker
                center={positions[positions.length - 1]}
                radius={8}
                pathOptions={{ color: '#EF4444', fillColor: '#EF4444', fillOpacity: 1 }}
              >
                <Tooltip permanent={false}>End</Tooltip>
              </CircleMarker>
            )}
          </MapContainer>
        )}
      </DialogContent>

      {!fullScreen && (
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
