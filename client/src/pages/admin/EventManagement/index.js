/* eslint-disable */
import React, { useState, useEffect } from 'react'
// material
import { Container, Typography, Grid, Tabs, Tab, Box, Button, Modal, Backdrop, Fade, TextField, Stack, Alert } from '@material-ui/core'
import { capitalCase } from 'change-case'

// hooks
import useSettings from '../../../hooks/useSettings'
import useDraw from '../../../hooks/useDraw';
// components
import Page from '../../../components/Page'
import PredictionTable from './PredictionTable'
import SateliteEvent from './SateliteEvent'
import MainEvent from './MainEvent'
import CurrentEvent from './CurrentEvent'
import DaysAccordion from './DaysAccordions'
// icons
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';

// ----------------------------------------------------------------------
export default function EventManagement() {
  const { themeStretch } = useSettings()
  const { isCreatedEvent, current_event, create_event, getCurrentEvent  } = useDraw();

  useEffect(() => {
    getCurrentEvent();
  }, []);

  const [currentTab, setCurrentTab] = useState('Satelite_event')
  const [formData, setFormData] = useState({
    eventName: ''
  });
  const {eventName} = formData;
  const onChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleChangeTab = (event, newValue) => {
    setCurrentTab(newValue)
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    handleClose();
    await create_event({ eventName });
  };
  
  const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
  };

  const TABS = [
    {
      value: 'Satelite_event',
      component: <SateliteEvent />,
    },
    {
      value: 'Main_event',
      component: <MainEvent />,
    },
  ]

  let newDisabled = current_event ? current_event.status < 2 : false;

  return (
    <Page>
      <Container maxWidth={themeStretch ? false : 'xl'}>
        {/* Title */}
        <Typography variant="h3" component="h1" paragraph>
          Event Management
        </Typography>
        <Grid container>
          {/* Tabs */}
          <Grid item xs={12} md={7} >
            {/* Add New Event */}
            <Button variant="outlined" disabled={newDisabled}  onClick={handleOpen} startIcon={<AddCircleOutlineIcon />}>
              New Event
            </Button>
            {current_event ? 
              <Alert severity="success" sx={{mt: 2, mb: 2, marginRight: '10px'}}>Event created! You can create Main Event and Satellite Event.</Alert>  : 
              <Alert severity="info" sx={{mt: 2, mb: 2, marginRight: '10px'}}>Create a new event using above button.<br /> After that, you can create Satellite and Main Event.</Alert>
            }
            {/* Display Events */}
            <CurrentEvent />
            <Modal
              aria-labelledby="transition-modal-title"
              aria-describedby="transition-modal-description"
              open={open}
              onClose={handleClose}
              closeAfterTransition
              BackdropComponent={Backdrop}
              BackdropProps={{
                timeout: 500,
              }}
            >
              <Fade in={open}>
                <Box sx={style}>
                  <Typography id="transition-modal-title" variant="h6" component="h2">
                    Create A New Event !
                  </Typography>
                  
                  <TextField
                    fullWidth
                    autoComplete="eventName"
                    label="Event Name"
                    name="eventName"
                    value={eventName}
                    onChange={onChange}
                    sx={{mt: 3}}
                  />
                  <Stack spacing={2} direction="row" justifyContent="right" sx={{mt: 3}}>
                    <Button onClick={onSubmit} variant="outlined" sx={{background: "transparent"}}>Ok</Button>
                    <Button onClick={handleClose} variant="contained" sx={{background: "transparent"}}>Close</Button>
                  </Stack>
                </Box>
              </Fade>
            </Modal>

            {/* Tabs */}
            { current_event ?
              <Tabs
                value={currentTab}
                scrollButtons="auto"
                variant="scrollable"
                allowScrollButtonsMobile
                onChange={handleChangeTab}
              >
                {TABS.map((item) => (
                  <Tab
                    disableRipple
                    key={item.value}
                    value={item.value}
                    icon={item.icon}
                    label={capitalCase(item.value)}
                  />
                ))}
              </Tabs> : 
              <></>
            }
            { current_event ? TABS.map((item) => {
              const isMatched = item.value === currentTab
              return isMatched && <Box key={item.value}>{item.component}</Box>
            }) : <></>}
          </Grid>
          {/* Prediction table */}
          <Grid item xs={12} md={5}>
            <PredictionTable />
          </Grid>
        </Grid>
      </Container>
    </Page>
  )
}
