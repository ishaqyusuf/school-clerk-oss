import { Text } from "@react-pdf/renderer";
import { View } from "@school-clerk/react-pdf";

interface Props {
  className?: string;
  children;
  title;
}

export function MetaData(props: Props) {
  return (
    <View className={`${props.className}`}>
      <View className="whitespace-nowrap">
        <Text>{props.title}</Text>
      </View>
      <View>{props.children}</View>
    </View>
  );
}
