import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
  ValidationPipeOptions
} from '@nestjs/common'

export class ErrorValidationPipe extends ValidationPipe {
  constructor(args: ValidationPipeOptions = {}) {
    super({
      exceptionFactory: (errors: ValidationError[]) => {
        const formattedErrors = errors.map((error: ValidationError) => {
          return {
            property: error.property,
            value: error.value,
            children: error.children,
            messages: error.constraints
              ? Object.values(error.constraints)
              : undefined
          }
        })

        return new BadRequestException(formattedErrors, 'Invalid Input')
      },
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      validationError: { target: false },
      ...args,
    })
  }
}
