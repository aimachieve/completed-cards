import { useEffect, useRef, useState } from 'react'
import Slider from 'react-slick'
import PropTypes from 'prop-types'
// material
import { useTheme, styled } from '@material-ui/core/styles'
import { Box, Paper, Typography, Stack, Card, Button } from '@material-ui/core'
import { CarouselControlsArrowsBasic3 } from '../components/carousel/controls'

// ----------------------------------------------------------------------

const MOCK_CAROUSELS = [...Array(8)].map((_, index) => ({
  id: index,
  title: 'Musical',
  image: '/images/city1.png',
  description: 'Instruments',
}))

const RootStyle = styled('div')(({ theme }) => ({
  // overflow: 'hidden',
  position: 'relative',
  '& .slick-slide': {
    opacity: 0.2,
    transition: 'all .5s',
  },
  '& .slick-center': {
    transform: 'scale(1.3)',
    opacity: 1,
  },
}))
// ----------------------------------------------------------------------

CarouselItem.propTypes = {
  item: PropTypes.object,
}

function CarouselItem({ currentEvent, item, index }) {
  console.log(item, index)
  const theme = useTheme()

  const register = (index, item) => {
    let user = localStorage.getItem('user')
    let cart = localStorage.getItem('cart')
    localStorage.setItem('currentProductIndex', index)
    console.log('currentIndex', localStorage.getItem('currentProductIndex'))
    if (user === null) {
      window.location.href = '/auth/login'
    }

    const userInfo = JSON.parse(user);
    const cartInfo = JSON.parse(cart);

    if (index === 0) {
      if (cartInfo.length === 0) {
        cartInfo.push({
          index: index,
          user_id: userInfo._id,
          event: currentEvent._id,
          price: item.price,
          username: userInfo.username,
          qty: 0
        })

        window.localStorage.setItem(
          'cart',
          JSON.stringify(cartInfo),
        )
      } else {
        let exist = cartInfo.filter(item => item.index === index)
        if (exist.length === 0) {
          cartInfo.push({
            index: index,
            user_id: userInfo._id,
            event: currentEvent._id,
            price: item.price,
            username: userInfo.username,
            qty: 0
          })

          window.localStorage.setItem(
            'cart',
            JSON.stringify(cartInfo),
          )
        }
      }
    } else {
      if (cartInfo.length === 0) {
        cartInfo.push({
          index: index,
          user_id: userInfo._id,
          eventId: currentEvent._id,
          satelliteId: item._id,
          price: item.price,
          qty: 0
        })

        window.localStorage.setItem(
          'cart',
          JSON.stringify(cartInfo),
        )
      } else {
        let exist = cartInfo.filter(item => item.index === index)
        if (exist.length === 0) {
          cartInfo.push({
            index: index,
            user_id: userInfo._id,
            eventId: currentEvent._id,
            satelliteId: item._id,
            price: item.price,
            qty: 0
          })

          window.localStorage.setItem(
            'cart',
            JSON.stringify(cartInfo),
          )
        }
      }
    }

    console.log(window.localStorage.getItem('cart'))
    window.location.href = '/purchaseTicket'
  }
  return (
    <Box
      sx={{
        textAlign: 'center',
        mx: 1,
        borderRadius: 1,
        display: 'flex',
        justifyContent: 'center',
        height: 400,
        boxShadow: '0px 4px 31px rgba(0, 0, 0, 0.11)',
        position: 'relative',
        my: 10,
      }}
    >
      {index === 0 ? (
        <Card
          sx={{
            px: 4,
            py: 3,
            backgroundColor: '#000',
            borderRadius: 0,
            width: '100%',
          }}
        >
          <Stack spacing={2}>
            <Typography variant="h3" color="common.white">
              Main Event
            </Typography>
            <Stack>
              <Typography variant="h5" color="common.white">
                Entry Fee
              </Typography>
              <Typography fontSize={50} fontWeight="bold">
                ${item.price}
              </Typography>
            </Stack>
            <Paper
              sx={{ backgroundColor: 'common.white', py: 2, height: 110 }}
            >
              {/* <Typography align="center" color="common.black" fontSize={18}>
                Total entries:{' '}
                <Typography variant="h4" component="span" color="primary">
                  {item.entries}
                </Typography>
              </Typography> */}
            </Paper>
            <Button
              variant="contained"
              color="success"
              sx={{ color: 'common.white', textTransform: 'uppercase' }}
              size="large"
              onClick={() => register(index, item)}
            >
              Register Now
            </Button>
          </Stack>
        </Card>
      ) : (
        <Card
          sx={{
            px: 4,
            py: 4,
            backgroundColor:
              index % 2 === 1 ? '#29B2FE' : theme.palette.grey[500],
            borderRadius: 0,
            width: '100%',
          }}
        >
          <Stack spacing={2}>
            <Typography variant="h3" color="common.white">
              Satellite Event {index}
            </Typography>
            <Stack>
              <Typography variant="h5" color="common.white">
                Entry Fee
              </Typography>
              <Typography fontSize={50} fontWeight="bold">
                ${item.price}
              </Typography>
            </Stack>
            <Paper sx={{ backgroundColor: 'common.white', py: 2 }}>
              <Typography align="center" color="common.black" fontSize={18}>
                Total entries:{' '}
                <Typography variant="h4" component="span" color="primary">
                  {item.entries}
                </Typography>
              </Typography>
            </Paper>
            <Button
              variant="contained"
              color="success"
              sx={{ color: 'common.white', textTransform: 'uppercase' }}
              size="large"
              onClick={() => register(index, item)}
            >
              Register Now
            </Button>
          </Stack>
        </Card>
      )}
    </Box>
  )
}

export default function EventsCarousel({ current_event }) {
  console.log("current_event", current_event)
  const carouselRef = useRef()
  const [events, setEvents] = useState([])

  const settings = {
    slidesToShow: 3,
    arrows: false,
    centerMode: true,
    centerPadding: '0px',
    adaptiveHeight: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: { slidesToShow: 5 },
      },
      {
        breakpoint: 960,
        settings: { slidesToShow: 3 },
      },
      {
        breakpoint: 480,
        settings: { slidesToShow: 1, centerPadding: '0' },
      },
    ],
  }

  const handlePrevious = () => {
    carouselRef.current.slickPrev()
  }

  const handleNext = () => {
    carouselRef.current.slickNext()
  }

  useEffect(() => {
    const tempEvents = []
    if (current_event) {
      tempEvents.push(current_event.main)
      current_event.satellite.map((item, index) => {
        tempEvents.push(item)
      })
    }
    setEvents(tempEvents)
  }, [current_event])
  console.log("tempEvents", events)
  return (
    <RootStyle>
      <Slider ref={carouselRef} {...settings}>
        {events.map((item, key) => (
          <CarouselItem key={key} item={item} currentEvent={current_event} index={key} />
        ))}
      </Slider>
      <CarouselControlsArrowsBasic3
        onNext={handleNext}
        onPrevious={handlePrevious}
      />
    </RootStyle>
  )
}
