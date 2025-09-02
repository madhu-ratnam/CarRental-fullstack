import Booking from "../models/Booking.js"
import car from '../models/car.js'

// Function to check Availability of car for a given Date\
const checkAvailability = async(car, pickupDate, returnDate)=>{
    const bookings = await Booking.find({
        car,
        pickupDate: {$lte: returnDate},
        returnDate: {$gte: pickupDate},
    })
    return bookings.length === 0;
}

// API TO CHECK Availability of Cars for the given Date and location
export const checkAvailabilityOfCar = async(req, res)=>{
    try {
        const {location, pickupDate, returnDate} = req.body
        // fetch all available cars for the given location
        const cars = await car.find({location, isAvaliable: true})

        //check car availability for the given date range using promise
        const availabilityCarsPromises = cars.map(async(car)=>{
            const isAvaliable = await checkAvailability(car._id, pickupDate, returnDate)
            return {...car._doc, isAvaliable: isAvaliable}
        })

        let availableCars = await Promise.all(availabilityCarsPromises);
        availableCars = availableCars.filter(car => car.isAvaliable === true)

        res.json({success: true, availableCars})

    } catch (error) {
        console.log(error.message);
        res.json({success: false, message:error.message})
    }
}

//API to create Booking
export const createBooking = async(req, res)=>{
    try {
        const {_id} = req.user;
        const {car, pickupDate, returnDate}= req.body;

        const isAvaliable = await checkAvailability(car, pickupDate,returnDate)
        if (!isAvaliable) {
            return res.json({success: false, message: "Car is not available"})
        }
        const carDate = await car.findById(car)

        //Calculate price based on pickupDate and returnDate
        const picked = new Date(pickupDate);
        const returned = new Date(returnDate);
        const noOfDays = Math.ceil((returned - picked) / (1000 * 60 * 60 * 24))
        const price = carDate.pricePerDay * noOfDays;

        await Booking.create({car, owner: carDate.owner, user: _id, pickupDate,
        returnDate, price})

        res.json({success: true, message: "Booking Created"})

    } catch (error) {
        console.log(error.message);
        res.json({success: false, message:error.message})
    }
}

// Api to List User Bookings
export const getUserBookings = async(req, res)=>{
    try {
        const {_id} = req.user;
        const bookings = await Booking.find({ user:_id}).populate("car").sort
        ({createdAt: -1})
        res.json({success: true, bookings})

    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

// Api to get Owner Bookings
export const getOwnerBookings = async(req, res)=>{
    try {
        if (req.user.role !== 'owner') {
            return res.json({success: false, message: "Unauthorized"})
        }
        const bookings = await Booking.find({owner: req.user._id}).populate
        ('car user').select("-user.password").sort({createdAt: -1})
        res.json({success: true, bookings})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}

//API to change the booking status
export const changeBookingStatus = async(req, res)=>{
    try {
        const {_id} = req.user;
        const {bookingId, status} = req.body
        
        const booking = await Booking.findById(bookingId)

        if (booking.owner.toString() !== _id.toString()) {
            return res.json({success: false, message: "Unauthorized"})
        }

        booking.status= status;
        await booking.save();

        res.json({success: true, message: "Status Updated"})
    } catch (error) {
        console.log(error.message);
        res.json({success: false, message: error.message})
    }
}