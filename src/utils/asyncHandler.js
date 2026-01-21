// utils/asyncHandler.js
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };

// const asyncHandler = (requestHandler) => async (req,res,next) =>{
//     try {
//         await requestHandler(req,res,next)
//     } catch (error) {
//         res.status(error.code || 500).json({
//             successFlag:false,
//             message:error.message
//         })
//     }
// }
