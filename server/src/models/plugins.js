// Shared schema options: expose `id` instead of `_id`, hide `__v`.
export const toJSON = {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
};
