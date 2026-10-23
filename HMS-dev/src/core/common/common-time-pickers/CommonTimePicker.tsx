import { TimePicker, type TimePickerProps } from "antd";

interface CommonTimePickerProps extends TimePickerProps {
  className?: string;
  ariaLabel?: string;
}

const CommonTimePicker: React.FC<CommonTimePickerProps> = ({
  className = "",
  ariaLabel = "Time picker",
  onChange,
  ...props
}) => {
  const handleChange = (time: any, timeString?: string | string[]) => {
    if (onChange) {
      onChange(time, timeString || "");
    }
  };

  return (
    <TimePicker
      className='form-control flatpickr-input'
      format="HH:mm"
      suffixIcon={<i className="ti ti-clock-hour-10 text-dark" aria-hidden="true" />}
      aria-label={ariaLabel}
      onChange={handleChange}
      needConfirm={false}
      {...props}
    />
  );
};

export default CommonTimePicker;