import dotenv from "dotenv";
import mongoose from "mongoose";
import { ROLES } from "../src/constants/roles.js";
import { connectDatabase } from "../src/db/mongoose.js";
import { Exercise } from "../src/models/Exercise.js";
import { Gym } from "../src/models/Gym.js";
import { Plan } from "../src/models/Plan.js";
import { TrainerProfile } from "../src/models/TrainerProfile.js";
import { User } from "../src/models/User.js";
import { hashPassword } from "../src/services/password.service.js";

dotenv.config();

const seed = async () => {
  await connectDatabase();

  await Promise.all([
    User.deleteMany({}),
    TrainerProfile.deleteMany({}),
    Exercise.deleteMany({}),
    Gym.deleteMany({}),
    Plan.deleteMany({}),
  ]);

  const [owner, trainer, member] = await User.create([
    {
      phone: "9990001111",
      email: "owner@gym.local",
      fullName: "Olivia Owner",
      role: ROLES.OWNER,
      passwordHash: hashPassword("Owner@123"),
    },
    {
      phone: "9990002222",
      email: "trainer@gym.local",
      fullName: "Theo Trainer",
      role: ROLES.TRAINER,
      passwordHash: hashPassword("Trainer@123"),
    },
    {
      phone: "9990003333",
      email: "member@gym.local",
      fullName: "Mia Member",
      role: ROLES.MEMBER,
      passwordHash: hashPassword("Member@123"),
    },
  ]);

  const gym = await Gym.create({
    owner: owner._id,
    name: "Iron Pulse Fitness",
    slug: "iron-pulse-fitness",
    location: {
      address: "12 Main Street",
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
    },
    amenities: ["Steam room", "Strength zone", "Nutrition desk"],
    trainers: [trainer._id],
    qrToken: "demo-qr-token",
  });

  await TrainerProfile.create({
    user: trainer._id,
    specialties: ["Strength", "Mobility"],
    assignedGymIds: [gym._id],
  });

  await Plan.create([
    {
      gym: gym._id,
      title: "1 day Membership",
      durationKey: "1-day",
      durationLabel: "1 day",
      durationDays: 1,
      price: 199,
      features: ["Open gym", "Locker access"],
    },
    {
      gym: gym._id,
      title: "Monthly Membership",
      durationKey: "monthly",
      durationLabel: "Monthly",
      durationDays: 30,
      price: 2499,
      features: ["Unlimited entry", "2 trainer sessions"],
    },
  ]);

  await Exercise.create([
    {
      name: "Barbell Squat",
      bodyPart: "legs",
      difficulty: "intermediate",
      equipment: ["barbell", "rack"],
      instructions: ["Brace core", "Drive through heels"],
    },
    {
      name: "Lat Pulldown",
      bodyPart: "back",
      difficulty: "beginner",
      equipment: ["machine"],
      instructions: ["Keep chest tall", "Pull elbows down"],
    },
  ]);

  console.log("Seed completed", {
    ownerEmail: owner.email,
    ownerPassword: "Owner@123",
    trainerEmail: trainer.email,
    trainerPassword: "Trainer@123",
    memberEmail: member.email,
    memberPassword: "Member@123",
  });

  await mongoose.connection.close();
};

seed().catch(async (error) => {
  console.error(error);
  await mongoose.connection.close();
  process.exit(1);
});
