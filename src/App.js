import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Row, Col, Modal, Typography } from 'antd';
import { MapContainer, ZoomControl, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import iconik from './marker-icon.png'
import 'antd/dist/reset.css';
import './App.scss';

function App() {
  const [coords, setCoords] = useState({
    ip: null,
    latitude: '',
    longitude: '',
  });
  const [newMarkerCoords, setNewMarkerCoords] = useState({
    latitude: '',
    longitude: '',
    isEmpty: false
  });
  const [locations, setLocations] = useState([]);
  const [mapModal, setMapModal] = useState(false);
  const [locationsModal, setLocationsModal] = useState(false);
  const [errorModal, setErrorModal] = useState(false);
  const markerIcon = useMemo(() => new L.Icon({
    iconUrl: iconik,
    iconSize: [25, 25],
  }), []);
  const openMapModal = useCallback(() => setMapModal(true), []);
  const closeMapModal = useCallback(() => {
    setNewMarkerCoords({ latitude: '', longitude: '' });
    setMapModal(false)
  }, []);
  const closeLocationsModal = useCallback(() => setLocationsModal(false), []);
  const closeErrorModal = useCallback(() => setErrorModal(false), []);

  const showLocations = () => {
    const url = new URL('https://dev-sso.transparenterra.com/api/location-list-by-ip')
    const params = {ip: `${coords.ip}`}
    url.search = new URLSearchParams(params).toString();

    fetch(url, {
      method: 'POST',
      body: JSON.stringify(params)
    })
    .then(res => res.json())
    .then(({ data, errors }) => {
      const res=[];
      if (data.length === 0) return res;
      if (errors) throw new Error('No data found')
      for (let i=0; i<10; i++) {
        data[i] && res.push(data[i]);
      }
      return res;
    })
    .then(res => {
      setLocations(res)
      setLocationsModal(true)
    })
    .catch(err => setErrorModal(true))
  }

  function getLocation() {
    function showPosition(position) {
      setCoords(prev => ({
        ...prev,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }));
    }
    navigator.geolocation.getCurrentPosition(showPosition);
  }
  
  useEffect(() => {
    getLocation();
    fetch("https://api.db-ip.com/v2/free/self")
    .then(response => response.json())
    .then(result => setCoords(prev => ({
      ...prev,
      ip: result.ipAddress
    })));
  }, []);

  useEffect(() => {
    const url = new URL('https://dev-sso.transparenterra.com/api/location-list')
    fetch(url)
    .then(res => res.json())
    .then(({ data, errors }) => {
      const res=[];
      if (data.length === 0) return res;
      if (errors) throw new Error('No data found')
      for (let i=0; i<5; i++) {
        res.push(data[i]);
      }
      return res;
    })
    .then(res => {
      setLocations(res)
    })
    .catch(err => null)
  }, []);

  function LocationMarker() {
    const [position] = useState(null)
    useMapEvents({
      click(event) {
        const { lat: latitude, lng: longitude } = event.latlng
        setNewMarkerCoords({ 
          latitude: `${latitude}`,
          longitude: `${longitude}`,
          isEmpty: false });
      },
    })
  
    return position === null ? null : (
      <Marker position={position} style={{ backgroundColor: 'red' }}>
        <Popup>You are here</Popup>
      </Marker>
    )
  }

  const saveHandler = () => {
    if (!newMarkerCoords.latitude) {
      setNewMarkerCoords(prev => ({ ...prev, isEmpty: true }))
      return;
    }

    const { ip, latitude: coord_x, longitude: coord_y } = coords;
    const url = new URL('https://dev-sso.transparenterra.com/api/save-location');
    const params = {
      ip,
      coord_x,
      coord_y,
    };
    url.search = new URLSearchParams(params).toString();
    fetch(url, {
      method: "POST",
    })
    .then(res => res.json())
    .then(res => {
      if(res.errors) throw new Error('Error happened while saving data')
    })
    .then(res => setMapModal(false))
    .catch(err => console.log(err))
  }
  
  return (
    <>
      <Row className='app'>
        <Col className='app__container'>
          <Button className='app__container__first' onClick={openMapModal}>Open map</Button>
          <Button className='app__container__second' onClick={showLocations}>Show locations</Button>
        </Col>
      </Row>

      <Modal
        title='Transparenterra community map'
        open={mapModal}
        centered
        width={'65vw'}
        footer={null}
        onCancel={closeMapModal}
        onOk={closeMapModal}>
          <Col className='mapModal-container'>
            <MapContainer 
              center={[coords.latitude, coords.longitude]}
              zoom={12}
              zoomControl={false}
              touchZoom={'center'}
              maxZoom={17}
              minZoom={5}
              attributionControl={false}
              className='mapModal-container__map'>
                <ZoomControl position='bottomright'/>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {locations.length>0 && locations.map(({ id, coord_x, coord_y }) => (
                  <Marker 
                    key={id}
                    icon={markerIcon}
                    position={[+coord_x, +coord_y]}
                    alt={`mark ${coord_x}-${coord_y}`}>
                    <Popup>
                      A pretty Popup <br /> Easily customizable
                    </Popup>
                  </Marker>
                ))}
                <LocationMarker />
                {newMarkerCoords.latitude && <Marker 
                    key={Math.random()}
                    icon={markerIcon}
                    position={[newMarkerCoords.latitude, newMarkerCoords.longitude]} 
                    alt={`new mark`}>
                    <Popup>
                      New Popup
                    </Popup>
                  </Marker>}
            </MapContainer>
            <Col className='mapModal-container__footer'>
              {
                newMarkerCoords.isEmpty && 
                <Typography.Paragraph
                  className='mapModal-container__footer__errorText'>
                  Please, add marker before saving
                </Typography.Paragraph>
              }
              <Button 
                type='primary' 
                className='mapModal-container__footer__button'
                onClick={saveHandler}>Save</Button>
            </Col>
          </Col>
      </Modal>

      <Modal
        title='List of locations'
        open={locationsModal}
        centered
        footer={null}
        onCancel={closeLocationsModal}
        onOk={closeLocationsModal}
        className='listModal'>
          <>
              {locations.length>0 ? locations.map(({ id, ip, coord_x, coord_y }) => (
                <Row key={id} justify={'space-between'} className='row'>
                  <Col className='flex'>
                    <Typography.Text>Ip</Typography.Text>
                    <Typography.Text>{ip}</Typography.Text>
                  </Col>
                  <Col className='flex'>
                    <Typography.Text>Coord_x</Typography.Text>
                    <Typography.Text>{(+coord_x).toFixed(2)}</Typography.Text>
                  </Col>
                  <Col className='flex'>
                    <Typography.Text>Coord_y</Typography.Text>
                    <Typography.Text>{(+coord_y).toFixed(2)}</Typography.Text>
                  </Col>
                </Row>
              )) : (<Row>No saved Locations yet</Row>)}
          </>
      </Modal>

      <Modal
        title='Error'
        open={errorModal}
        centered
        className='errorModal'
        footer={[
          <Button className='errorModal__button' key="submit" type="primary" onClick={closeErrorModal}>OK</Button>,
        ]}
        onCancel={closeErrorModal}
        onOk={closeErrorModal}>
          <Typography.Paragraph className='errorModal__text'>Something went wrong try again</Typography.Paragraph>
      </Modal>
    </>
  );
}

export default App;