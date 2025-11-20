import { cn } from "@/lib/utils"
import { Input } from "../ui/input"
import { Label } from "../ui/label"

const InputField = ({ name, label, placeholder, disabled, error, validation, type = "text", value , register}: FormInputProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="form-label">
        {label}
      </Label>
      <Input
        type={type}
        id={name}
        placeholder={placeholder}
        disabled={disabled}
        defaultValue={value}
        className={cn("form-input", {'opacity-50 cursor-not-allowed': disabled})}
        {...register(name, validation)}
      />
      {error && <p className="text-sm text-red-500 font-medium">{error.message}</p>}
    </div>
  )
}

export default InputField