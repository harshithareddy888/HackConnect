import Joi from 'joi';

export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  bio: Joi.string().max(500),
  skills: Joi.array().items(Joi.string()),
  role: Joi.string().valid('developer', 'designer', 'product manager', 'data scientist', 'other'),
  experienceLevel: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert'),
  links: Joi.object({
    github: Joi.string().uri(),
    linkedin: Joi.string().uri()
  })
});
